const{StateMachine:StateMachine}=require("./statemachine.js"),{distinctUntilChanged:distinctUntilChanged,tap:tap}=require("rxjs/operators"),_=require("lodash"),FSM_NAME="finite-state-machine";module.exports=function(t){t.nodes.registerType(FSM_NAME,function(e){t.nodes.createNode(this,e);var a=this,i=this.context();try{i.machine=new StateMachine(JSON.parse(e.fsmDefinition)),s(i.machine.getState().status)}catch(t){return a.status({fill:"red",shape:"ring",text:"no valid definitions"}),void a.warn("no valid definitions")}function n(t=null){a.send([t])}function s(t){a.status({fill:"green",shape:"dot",text:"state: "+t})}i.allChangeListener=i.machine.observable.pipe(e.sendStateWithoutChange?tap():distinctUntilChanged((t,e)=>_.isEqual(t.state,e.state))).subscribe(({state:t,trigger:e})=>{s(t.status),n({topic:"state",payload:t,trigger:_.omit(e,"trigger")})}),e.sendInitialState&&setTimeout(()=>{n({topic:"state",payload:i.machine.getState()})},100),a.on("input",function(t){if("reset"!==t.control)if("sync"!==t.control){"query"===t.control&&i.machine.queryState();var n={type:t.topic,data:_.isObject(t.data)?t.data:{}};try{i.machine.triggerAction(n,t)}catch(i){e.showTransitionErrors&&a.error({code:i.code,msg:i.message},t)}}else try{i.machine.setState(t.payload)}catch(e){a.error({code:e.code,msg:e.message},t)}else i.machine.reset()}),a.on("close",function(){i.stateChangeListener.unsubscribe()})})};