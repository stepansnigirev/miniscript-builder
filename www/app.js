var numSocket = new Rete.Socket('Number value');
var policySocket = new Rete.Socket('Policy value');

var VueNumControl = {
	props: ['readonly', 'emitter', 'ikey', 'getData', 'putData'],
	template: `<input type="number" :readonly="readonly" :value="value" @input="change($event)" @dblclick.stop="" @pointerdown.stop="" @pointermove.stop=""/>`,
	data() {
		return {
			value: 0,
		}
	},
	methods: {
		change(e){
			this.value = +e.target.value;
			this.update();
		},
		update() {
			if (this.ikey)
				this.putData(this.ikey, this.value)
			this.emitter.trigger('process');
		}
	},
	mounted() {
		this.value = this.getData(this.ikey);
	}
}

var VueStringControl = {
	props: ['readonly', 'emitter', 'ikey', 'getData', 'putData'],
	template: `<input type="text" :readonly="readonly" :value="value" @input="change($event)" @dblclick.stop="" @pointerdown.stop="" @pointermove.stop=""/>`,
	data() {
		return {
			value: "",
		}
	},
	methods: {
		change(e){
			this.value = e.target.value;
			this.update();
		},
		update() {
			if (this.ikey)
				this.putData(this.ikey, this.value)
			this.emitter.trigger('process');
		}
	},
	mounted() {
		this.value = this.getData(this.ikey);
	}
}

class NumControl extends Rete.Control {

	constructor(emitter, key, readonly) {
		super(key);
		this.component = VueNumControl;
		this.props = { emitter, ikey: key, readonly };
	}

	setValue(val) {
		this.vueContext.value = val;
	}
}

class StringControl extends Rete.Control {

	constructor(emitter, key, readonly) {
		super(key);
		this.component = VueStringControl;
		this.props = { emitter, ikey: key, readonly };
	}

	setValue(val) {
		this.vueContext.value = val;
	}
}

class NumComponent extends Rete.Component {

	constructor(){
		super("Number");
	}

	builder(node) {
		var out1 = new Rete.Output('num', "Number", numSocket);

		return node.addControl(new NumControl(this.editor, 'num')).addOutput(out1);
	}

	worker(node, inputs, outputs) {
		outputs['num'] = node.data.num;
	}
}

class AddComponent extends Rete.Component {
	constructor(){
		super("Add");
	}

	builder(node) {
		var inp1 = new Rete.Input('num',"Number", numSocket);
		var inp2 = new Rete.Input('num2', "Number", numSocket);
		var out = new Rete.Output('num', "Number", numSocket);

		inp1.addControl(new NumControl(this.editor, 'num'))
		inp2.addControl(new NumControl(this.editor, 'num2'))

		return node
				.addInput(inp1)
				.addInput(inp2)
				.addControl(new NumControl(this.editor, 'preview', true))
				.addOutput(out);
	}

	worker(node, inputs, outputs) {
		var n1 = inputs['num'].length?inputs['num'][0]:node.data.num;
		var n2 = inputs['num2'].length?inputs['num2'][0]:node.data.num2;
		var sum = n1 + n2;
		
		this.editor.nodes.find(n => n.id == node.id).controls.get('preview').setValue(sum);
		outputs['num'] = sum;
	}
}

class TimeComponent extends Rete.Component {
	constructor(name="After"){
		super(name);
		this._op = name.toLowerCase();
	}

	builder(node) {
		var inp = new Rete.Input('num',"Number", numSocket);
		var out = new Rete.Output('pol', "Policy", policySocket);

		inp.addControl(new NumControl(this.editor, 'num'))

		return node
				.addInput(inp)
				.addControl(new StringControl(this.editor, 'preview', true))
				.addOutput(out);
	}

	worker(node, inputs, outputs) {
		var n = inputs['num'].length ? inputs['num'][0]:node.data.num;
		n = (n==undefined) ? 0 : n;
		var pol = `${this._op}(${n})`;

		this.editor.nodes.find(n => n.id == node.id).controls.get('preview').setValue(pol);
		outputs['pol'] = pol;
	}
}

class ThreshComponent extends Rete.Component {
	constructor(){
		super("Threshold");
	}

	builder(node) {
		var inp1 = new Rete.Input('num',"Number", numSocket);
		var inp2 = new Rete.Input('pol1', "Policy", policySocket);
		var out = new Rete.Output('pol', "Policy", policySocket);

		inp1.addControl(new NumControl(this.editor, 'num'))
		inp2.addControl(new StringControl(this.editor, 'pol1'))

		return node
				.addInput(inp1)
				.addInput(inp2)
				.addControl(new StringControl(this.editor, 'preview', true))
				.addOutput(out);
	}

	worker(node, inputs, outputs) {
		var n = inputs['num'].length ? inputs['num'][0]:node.data.num;
		n = (n==undefined) ? 0 : n;
		var pol = `thresh(${n})`;
		let nodeobj = this.editor.nodes.find(n => n.id == node.id);
		// add missing sockets
		for(let i=1; i<n+1; i++){
			if(inputs[`pol${i}`] == undefined){
				let inp = new Rete.Input(`pol${i}`, "Policy", policySocket);
				inp.addControl(new StringControl(this.editor, `pol${i}`));
				nodeobj.addInput(inp);
			}
		}
		// remove empty sockets at the end
		for(let i = Object.keys(node.inputs).length-1; i > n + 1; i--){
			let inp = nodeobj.inputs.get(`pol${i}`);
			if(inp){
				nodeobj.removeInput(inp);
				nodeobj.update();
			}
		}
		nodeobj.controls.get('preview').setValue(pol);
		nodeobj.update();
		console.log(nodeobj);
		outputs['pol'] = pol;
	}
}

(async () => {
	var container = document.querySelector('#rete');
	var components = [
		new NumComponent(),
		new AddComponent(),
		new TimeComponent("After"),
		new TimeComponent("Older"),
		new ThreshComponent(),
	];
	
	var editor = new Rete.NodeEditor('demo@0.1.0', container);
	editor.use(ConnectionPlugin.default);
	editor.use(VueRenderPlugin.default);    
	editor.use(ContextMenuPlugin.default);
	editor.use(AreaPlugin);
	editor.use(CommentPlugin.default);
	editor.use(HistoryPlugin);
	editor.use(ConnectionMasteryPlugin.default);

	var engine = new Rete.Engine('demo@0.1.0');
	
	components.map(c => {
		editor.register(c);
		engine.register(c);
	});

	var n1 = await components[0].createNode({num: 2});
	var n2 = await components[0].createNode({num: 0});
	var add = await components[1].createNode();

	n1.position = [80, 200];
	n2.position = [80, 400];
	add.position = [500, 240];


	editor.addNode(n1);
	editor.addNode(n2);
	editor.addNode(add);

	editor.connect(n1.outputs.get('num'), add.inputs.get('num'));
	editor.connect(n2.outputs.get('num'), add.inputs.get('num2'));


	editor.on('process nodecreated noderemoved connectioncreated connectionremoved', async () => {
		console.log('process');
		await engine.abort();
		await engine.process(editor.toJSON());
	});

	editor.view.resize();
	AreaPlugin.zoomAt(editor);
	editor.trigger('process');
})();