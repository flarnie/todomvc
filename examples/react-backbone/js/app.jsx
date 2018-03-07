/**
 * @jsx React.DOM
 */
/*jshint quotmark:false */
/*jshint white:false */
/*jshint trailing:false */
/*jshint newcap:false */
/*global React, Backbone */
var app = app || {};

(function () {
	'use strict';

	app.ALL_TODOS = 'all';
	app.ACTIVE_TODOS = 'active';
	app.COMPLETED_TODOS = 'completed';
	var TodoFooter = app.TodoFooter;
	var TodoItem = app.TodoItem;

	var ENTER_KEY = 13;

        // TODO: this is ugly, convoluted, not sure it works well.
        // Use the new context API instead?
        // Do we recommend the new context API for any case where you have more
        // than one subscription?
        // In that case, is the helper wrapper still useful? :\
        const BackboneSubscription = createSubscription.createSubscription({
          getValue(backboneCollectionConfig) {
            return backboneCollectionConfig;
          },

          subscribe(backboneCollectionConfig, callback) {
            // Whenever there may be a change in the Backbone data, trigger a
            // reconcile.
            Object.values(backboneCollectionConfig).forEach(function (collection) {
              // explicitly bind backboneCollections as the argument,
              // `collection` events passes additional arguments that we ignore
              collection.on('add remove change', () => {
                // make shallow copy, to force an update based on changed value
                const updatedBackboneCollectionConfig = {};
                Object.keys(backboneCollectionConfig).forEach(k => {
                  updatedBackboneCollectionConfig[k] = backboneCollectionConfig[k];
                });
                callback(updatedBackboneCollectionConfig);
              });
            }, this);
          },

          unsubscribe(backboneCollectionConfig, _) {
            // Ensure that we clean up any dangling references when the component is
            // destroyed.
            backboneCollectionConfig().forEach(function (collection) {
              collection.off(null, null, this);
            }, this);
          },
        });

	var TodoApp = React.createClass({
		getInitialState: function () {
			return {editing: null};
		},

		componentDidMount: function () {
			var Router = Backbone.Router.extend({
				routes: {
					'': 'all',
					'active': 'active',
					'completed': 'completed'
				},
				all: this.setState.bind(this, {nowShowing: app.ALL_TODOS}),
				active: this.setState.bind(this, {nowShowing: app.ACTIVE_TODOS}),
				completed: this.setState.bind(this, {nowShowing: app.COMPLETED_TODOS})
			});

			new Router();
			Backbone.history.start();

			this.props.collectionsConfig.todos.fetch();
		},

		componentDidUpdate: function () {
			// If saving were expensive we'd listen for mutation events on Backbone and
			// do this manually. however, since saving isn't expensive this is an
			// elegant way to keep it reactively up-to-date.
			this.props.collectionsConfig.todos.forEach(function (todo) {
				todo.save();
			});
		},

		handleNewTodoKeyDown: function (event) {
			if (event.which !== ENTER_KEY) {
				return;
			}

			var val = React.findDOMNode(this.refs.newField).value.trim();
			if (val) {
				this.props.collectionsConfig.todos.create({
					title: val,
					completed: false,
					order: this.props.collectionsConfig.todos.nextOrder()
				});
				React.findDOMNode(this.refs.newField).value = '';
			}

			event.preventDefault();
		},

		toggleAll: function (event) {
			var checked = event.target.checked;
			this.props.collectionsConfig.todos.forEach(function (todo) {
				todo.set('completed', checked);
			});
		},

		edit: function (todo, callback) {
			// refer to todoItem.jsx `handleEdit` for the reason behind the callback
			this.setState({editing: todo.get('id')}, callback);
		},

		save: function (todo, text) {
			todo.save({title: text});
			this.setState({editing: null});
		},

		cancel: function () {
			this.setState({editing: null});
		},

		clearCompleted: function () {
			this.props.collectionsConfig.todos.completed().forEach(function (todo) {
				todo.destroy();
			});
		},

		render: function () {
			var footer;
			var main;
			var todos = this.props.collectionsConfig.todos;

			var shownTodos = todos.filter(function (todo) {
				switch (this.state.nowShowing) {
				case app.ACTIVE_TODOS:
					return !todo.get('completed');
				case app.COMPLETED_TODOS:
					return todo.get('completed');
				default:
					return true;
				}
			}, this);

			var todoItems = shownTodos.map(function (todo) {
				return (
					<TodoItem
						key={todo.get('id')}
						todo={todo}
						onToggle={todo.toggle.bind(todo)}
						onDestroy={todo.destroy.bind(todo)}
						onEdit={this.edit.bind(this, todo)}
						editing={this.state.editing === todo.get('id')}
						onSave={this.save.bind(this, todo)}
						onCancel={this.cancel}
					/>
				);
			}, this);

			var activeTodoCount = todos.reduce(function (accum, todo) {
				return todo.get('completed') ? accum : accum + 1;
			}, 0);

			var completedCount = todos.length - activeTodoCount;

			if (activeTodoCount || completedCount) {
				footer =
					<TodoFooter
						count={activeTodoCount}
						completedCount={completedCount}
						nowShowing={this.state.nowShowing}
						onClearCompleted={this.clearCompleted}
					/>;
			}

			if (todos.length) {
				main = (
					<section className="main">
						<input
							id="toggle-all"
							className="toggle-all"
							type="checkbox"
							onChange={this.toggleAll}
							checked={activeTodoCount === 0}
						/>
						<label
							htmlFor="toggle-all"
						/>
						<ul className="todo-list">
							{todoItems}
						</ul>
					</section>
				);
			}

			return (
				<div>
					<header className="header">
						<h1>todos</h1>
						<input
							ref="newField"
							className="new-todo"
							placeholder="What needs to be done?"
							onKeyDown={this.handleNewTodoKeyDown}
							autoFocus={true}
						/>
					</header>
					{main}
					{footer}
				</div>
			);
		}
	});

	React.render(
          <BackboneSubscription source={{todos: app.todos}}>
            {collectionsConfig => <TodoApp collectionsConfig={collectionsConfig} />}
          </BackboneSubscription>,
		document.getElementsByClassName('todoapp')[0]
	);
})();
