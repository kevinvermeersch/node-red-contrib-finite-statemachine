const { StateMachine } = require('./statemachine.js');
const { distinctUntilChanged, tap } = require('rxjs/operators');
const _ = require('lodash');

const FSM_NAME = 'finite-state-machine';

module.exports = function (RED) {
	function StateMachineNode (config) {
		RED.nodes.createNode(this, config);

		var node = this;
		var nodeContext = this.context();


		// create new state machine
		try {
			nodeContext.machine = new StateMachine(JSON.parse(config.fsmDefinition));
			setNodeStatus(nodeContext.machine.getState().status)
		} catch (err) {
			node.status({fill: 'red', shape: 'ring', text: 'no valid definitions'});
			node.warn('no valid definitions')
			return;
		}

		// react to all changes
		nodeContext.allChangeListener = nodeContext.machine.observable.pipe(
			config.sendStateWithoutChange ? tap() : distinctUntilChanged( (curr,prev) => _.isEqual(curr.state, prev.state)) )
			.subscribe(({state, trigger}) => {
				setNodeStatus(state.status)
				sendOutput({
					topic: 'state',
					payload: state,
					trigger: _.omit(trigger, "trigger") // prevent recursive adding of trigger object
				});
		});

		// send initial state after 100ms
		if (config.sendInitialState) {
			setTimeout( () => {
				sendOutput({
					topic: 'state',
					payload: nodeContext.machine.getState()
				});
			},100);
		}

		node.on('input', function (msg) {
			if (msg.control === 'reset') {
				nodeContext.machine.reset();
				return;
			} else if (msg.control === 'sync') {
				try {
					nodeContext.machine.setState(msg.payload);
				} catch (err) {
					node.error({ code: err.code, msg: err.message}, msg);
				}
				return;
			} else if (msg.control === 'query') {
				nodeContext.machine.queryState()
				return;
			}

			var action = {
				type: msg.topic,
				data : _.isObject(msg.data) ? msg.data : {}
			}
			try {
				nodeContext.machine.triggerAction(action, msg);
			} catch (err) {
				if (config.showTransitionErrors) {
					node.error({ code: err.code, msg: err.message}, msg);
				}
			}
		});

		node.on('close', function () {
			nodeContext.stateChangeListener.unsubscribe();
		});

		function sendOutput(state = null) {
			node.send([state])
		}

		function setNodeStatus(state) {
			node.status({fill: 'green', shape: 'dot', text: 'state: ' + state});
		}
	}
	RED.nodes.registerType(FSM_NAME, StateMachineNode);
};
