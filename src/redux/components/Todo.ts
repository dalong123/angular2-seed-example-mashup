import {Component, ChangeDetectionStrategy} from 'angular2/core';
import {Observable} from 'rxjs/Observable';
import {CORE_DIRECTIVES} from 'angular2/common';
import {ITodoState, ITodo, FilterNames, ITagSummary} from '../../services/redux/Todo/TodoReducer';
import {TodoService} from '../../services/redux/Todo/TodoService';
import {TodoTags} from './TodoTags/TodoTags';
import {TodoTag} from './TodoTags/TodoTag';

var autocomplete = require('jquery-ui/autocomplete');
var jQuery = require('jquery');

@Component({
    selector: 'todo',
    templateUrl: './redux/components/Todo.html',
    styleUrls: ['./redux/components/Todo.css'],

    // If we only rely on immutable inputs and properties, we can get performance
    // gains by telling angular to only check for changes when our inputs change.
    // See http://victorsavkin.com/post/133936129316/angular-immutability-and-encapsulation

    changeDetection: ChangeDetectionStrategy.OnPush,
    directives: [CORE_DIRECTIVES, TodoTags, TodoTag]
})

export class Todo {

    todoState: Observable<ITodoState>;
    filteredTodos: Observable<ITodo[]>;
    tags: Observable<ITagSummary[]>;
    tagFilter: string = null;

    textCompletionFunc:(request:{term: string}, callback:string)=>void;

    constructor(public todoService:TodoService) {
        this.todoState = this.todoService.todoStateChanged;

        // Filter and sort todos by descending date
        this.filteredTodos = this.todoState
            .map(state =>
                _.sortBy(
                    state.todos
                        .filter(todo => {
                            return  state.filterName === FilterNames.All  ||
                                    state.filterName === FilterNames.Active && !todo.done ||
                                    state.filterName === FilterNames.Complete && todo.done;
                        })

                        .filter(todo => !this.tagFilter || this.todoHasTag(todo, this.tagFilter))

                    , t => t.created ? -t.created.valueOf() : 0));

        this.tags = this.todoState.map(state => state.tagSummary);

        this.todoState.subscribe(state => {
            this.tagFilter = state.tagFilter;
        });

        this.textCompletionFunc = this.getTags.bind(this);
        console.log('autocomplete func is', autocomplete);
    }

    ngAfterContentInit() {
        console.log('ngAfterContentInit');
    }

    todoHasTag(todo:ITodo, tag:string) : boolean {
        return todo.tags && (todo.tags.indexOf(tag) >= 0);
    }

    addTodo(inputCtrl:HTMLInputElement) {
        let description = inputCtrl.value;
        this.todoService.addTodo(description);
        inputCtrl.value = '';   // Does this work
        inputCtrl.focus();

        // If we are adding, make sure the user can see the result
        if (this.todoService.getState().filterName === FilterNames.Complete) {
            this.todoService.filterTodos(FilterNames.Active);
        }
    }

    deleteTodo(todo:ITodo) {
        this.todoService.deleteTodo(todo.id);
    }

    getTodoClass(todo:ITodo) {
        return todo.done ? 'completed' : 'active';
    }

    toggleTodo(todo:ITodo) {
        this.todoService.toggleTodo(todo.id);
    }

    filter(filterName:string) {
        this.todoService.filterTodos(filterName);
    }

    filterTagClick(tag:string) {
        if (tag !== this.tagFilter) {
            console.log(`Filtering on tag ${tag}.`);
            this.todoService.filterTodosByTag(tag);
        } else {
            console.log('Clearing tag filter');
            this.todoService.filterTodosByTag(null);
        }
    }

    filterTagClicked(tag:string) {
        console.log('Please cancel todo tag filtering!');
        this.todoService.filterTodosByTag(null);
    }

    getFilterClass(buttonFilterName:string) : string {
        let currentFilterName = this.todoService.getState().filterName;
        return buttonFilterName === currentFilterName ? 'active' : 'inactive';
    }

    // Tag entry.
    keydown(todo:ITodo,tag:HTMLInputElement, event:KeyboardEvent) {
        event.shiftKey = true;
        if (event.keyCode === 13) {
            console.log(`Adding tag ${tag.value} to todo ${todo.description}.`);
            this.todoService.addTag(todo.id, tag.value);
            tag.value = '';

            console.log(`Setting focus to ${tag.id}.`);
            tag.focus();    // So we can add a new tag
            console.log(`The active element is now ${document.activeElement.id}.`);
        }
    }

    tagLostFocus($event) {
        console.log(`Tag ${$event.srcElement.id} lost focus. The active element is now ${document.activeElement.id}.`);
    }

    deleteTag(todo:ITodo, tag:string) {
        this.todoService.deleteTag(todo.id, tag);
    }

    tagFocus(input:HTMLInputElement) {

        // When we get the focus on a tag, hook it up with auto-complete
        jQuery(input).autocomplete({
            source: this.textCompletionFunc
        });
    }

    getTags(request:{term: string}, callback:(string)=>void)  {
        let tags = this.todoService.getTags();
        let instr = request.term.toLowerCase();
        let matches = tags.filter(t => t.toLowerCase().indexOf(instr) >= 0);
        callback(matches);
    }
}
