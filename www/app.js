var numSocket = new Rete.Socket('Number');
var policySocket = new Rete.Socket('Policy');
var keySocket = new Rete.Socket('Key');
var descriptorSocket = new Rete.Socket('Descriptor');
var stringSocket = new Rete.Socket('String');

// helper function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/*************************** TEMPLATES *************************/

var VueNumControl = {
  props: ['readonly', 'emitter', 'ikey', 'getData', 'putData'],
  template: `<input type="number" min="0" step="1" :readonly="readonly" :value="value" @input="change($event)" @dblclick.stop="" @pointerdown.stop="" @pointermove.stop=""/>`,
  data() {
    return {
      value: 1,
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

var VuePreviewControl = {
  props: ['readonly', 'emitter', 'ikey', 'getData', 'putData'],
  template: `<div class="preview">{{value}}</div><input type="hidden" :readonly="readonly" :value="value" @input="change($event)" @dblclick.stop="" @pointerdown.stop="" @pointermove.stop=""/>`,
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

/*************************** CONTROLS *************************/

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

class PreviewControl extends Rete.Control {

  constructor(emitter, key, readonly) {
    super(key);
    this.component = VuePreviewControl;
    this.props = { emitter, ikey: key, readonly };
  }

  setValue(val) {
    this.vueContext.value = val;
  }
}

/*************************** POLICY COMPONENTS *************************/

class KeyComponent extends Rete.Component {

  constructor(){
    super("Key");
  }

  builder(node) {
    var out = new Rete.Output('key', "Policy", policySocket);
    return node.addControl(new StringControl(this.editor, 'key')).addOutput(out);
  }

  worker(node, inputs, outputs) {
    outputs['key'] = `pk(${node.data.key ? node.data.key : ''})`;
  }
}

class AndComponent extends Rete.Component {
  constructor(){
    super("And");
  }

  builder(node) {
    var inp1 = new Rete.Input('pol1',"Policy", policySocket);
    var inp2 = new Rete.Input('pol2', "Policy", policySocket);
    var out = new Rete.Output('pol', "Policy", policySocket);

    inp1.addControl(new StringControl(this.editor, 'pol1'))
    inp2.addControl(new StringControl(this.editor, 'pol2'))

    return node
        .addInput(inp1)
        .addInput(inp2)
        .addControl(new PreviewControl(this.editor, 'preview', true))
        .addOutput(out);
  }

  worker(node, inputs, outputs) {
    var p1 = inputs['pol1'].length?inputs['pol1'][0]:node.data.pol1;
    var p2 = inputs['pol2'].length?inputs['pol2'][0]:node.data.pol2;

    var pol = `and(${p1 ? p1 : ''},${p2 ? p2 : ''})`;
    this.editor.nodes.find(n => n.id == node.id).controls.get('preview').setValue(pol);
    outputs['pol'] = pol;
  }
}

// TODO: add probabilities
class OrComponent extends Rete.Component {
  constructor(){
    super("Or");
  }

  builder(node) {
    var inp1 = new Rete.Input('pol1',"Policy", policySocket);
    var inp2 = new Rete.Input('pol2', "Policy", policySocket);
    var out = new Rete.Output('pol', "Policy", policySocket);

    inp1.addControl(new StringControl(this.editor, 'pol1'))
    inp2.addControl(new StringControl(this.editor, 'pol2'))

    return node
        .addInput(inp1)
        .addInput(inp2)
        .addControl(new PreviewControl(this.editor, 'preview', true))
        .addOutput(out);
  }

  worker(node, inputs, outputs) {
    var p1 = inputs['pol1'].length?inputs['pol1'][0]:node.data.pol1;
    var p2 = inputs['pol2'].length?inputs['pol2'][0]:node.data.pol2;

    var pol = `or(${p1 ? p1 : ''},${p2 ? p2 : ''})`;
    this.editor.nodes.find(n => n.id == node.id).controls.get('preview').setValue(pol);
    outputs['pol'] = pol;
  }
}

class TimeComponent extends Rete.Component {
  constructor(name="After"){
    super(name);
    this._op = name.toLowerCase();
  }

  builder(node) {
    // var inp = new Rete.Input('num',"Number", numSocket);
    var out = new Rete.Output('pol', "Policy", policySocket);

    return node
        .addControl(new PreviewControl(this.editor, 'preview', true))
        .addControl(new NumControl(this.editor, 'num'))
        .addOutput(out);
  }

  worker(node, inputs, outputs) {
    var n = node.data.num;
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
    let pol = new Rete.Input(`policies`, "Policies", policySocket, true);
    node.addInput(pol);

    var out = new Rete.Output('pol', "Policy", policySocket);

    return node
        .addControl(new PreviewControl(this.editor, 'preview', true))
        .addControl(new NumControl(this.editor, 'thresh'))
        .addOutput(out);
  }

  worker(node, inputs, outputs) {
    let n = node.data.thresh;
    n = (n==undefined) ? 1 : n;
    let nodeobj = this.editor.nodes.find(n => n.id == node.id);
    let args = "";
    // sort alphabetically, bad but at least deterministic
    inputs['policies'].sort().forEach((inpol)=>{
      args += `,${inpol}`
    })
    let pol = `thresh(${n}${args})`;
    nodeobj.controls.get('preview').setValue(pol);
    outputs['pol'] = pol;
    nodeobj.update();
  }
}

/*************************** DESCRIPTOR *************************/

class DescriptorComponent extends Rete.Component {
  constructor(){
    super("Descriptor");
  }

  builder(node) {
    var inp = new Rete.Input('pol',"Policy", policySocket);
    var out = new Rete.Output('desc', "Descriptor", descriptorSocket);

    inp.addControl(new StringControl(this.editor, 'pol'))

    return node
        .addInput(inp)
        .addControl(new PreviewControl(this.editor, 'preview', true))
        .addOutput(out);
  }

  worker(node, inputs, outputs) {
    let pol = inputs['pol'].length ? inputs['pol'][0] : node.data.pol;
    let desc = '';
    try{
      desc = miniscript.compile(pol);
    }catch(e){
      desc = `Error: ${e}`;
    }
    this.editor.nodes.find(n => n.id == node.id).controls.get('preview').setValue(desc);
    outputs['desc'] = desc;
  }
}

class AddressComponent extends Rete.Component {
  constructor(){
    super("Address");
  }

  builder(node) {
    var inp = new Rete.Input('desc',"Descriptor", descriptorSocket);
    var out = new Rete.Output('addr', "Address", stringSocket);

    inp.addControl(new StringControl(this.editor, 'desc'))

    return node
        .addInput(inp)
        .addControl(new PreviewControl(this.editor, 'preview', true))
        .addControl(new NumControl(this.editor, 'idx'))
        .addOutput(out);
  }

  worker(node, inputs, outputs) {
    let desc = inputs['desc'].length ? inputs['desc'][0] : node.data.desc;
    let idx = node.data.idx;
    let addr = '';
    try{
      addr = miniscript.address(desc, idx);
    }catch(e){
      addr = `Error: ${e}`;
    }
    this.editor.nodes.find(n => n.id == node.id).controls.get('preview').setValue(addr);
    outputs['addr'] = addr;
  }
}

function toBase64(obj){
  return btoa(JSON.stringify(obj)).replace(/\//g, '_').replace(/\+/g, '-');
}

function fromBase64(b64){
  return JSON.parse(atob(b64.replace(/_/g, '/').replace(/-/g, '+')));
}

async function loadHash(){
  try{
    let o = fromBase64(window.location.hash.substr("#/full/".length))
    await editor.fromJSON(o);
    editor.view.resize();
    AreaPlugin.zoomAt(editor);
  }catch(e){
    console.error(`Error: ${e}`)
  }
}

/*************************** APP MAIN *************************/

function displayOut(node){
    let d = engine.data.nodes[node.id].outputData;
    let res = Object.values(d)[0];
    document.getElementById("node-name").innerText = node.name;
    document.getElementById("node-output").innerText = res;
}

async function app_init(){
  var container = document.querySelector('#rete');
  let AndC = new AndComponent();
  let AfterC = new TimeComponent("After");
  let OlderC = new TimeComponent("Older");
  let ThreshC = new ThreshComponent();
  let KeyC = new KeyComponent();
  let OrC = new OrComponent();
  let DescC = new DescriptorComponent();
  let AddressC = new AddressComponent();
  var components = [
    KeyC, AfterC, OlderC, ThreshC, AndC, OrC, DescC, AddressC
  ];

  window.editor = new Rete.NodeEditor('demo@0.1.0', container);
  editor.use(ConnectionPlugin.default);
  editor.use(VueRenderPlugin.default);    
  editor.use(ContextMenuPlugin.default, {
    searchBar: false,
  });
  editor.use(AreaPlugin);
  editor.use(CommentPlugin.default);
  editor.use(HistoryPlugin);
  // editor.use(DockPlugin.default,{
  //   container: document.querySelector('#dock'),
  //   // itemClass: 'item' // default: dock-item 
  //   plugins: [VueRenderPlugin.default], // render plugins
  // });
  editor.use(ConnectionMasteryPlugin.default);

  window.engine = new Rete.Engine('demo@0.1.0');

  components.map(c => {
    editor.register(c);
    engine.register(c);
  });

  if(window.location.hash.startsWith("#/full/")){
    await loadHash();
  }else{
    let n1 = await OlderC.createNode({num: 12960});
    let n2 = await KeyC.createNode({key: "xpub6BoPBGjkVAcue1y571JydPTaQ5iLfERUDxgao7ZRLiB2LDvvezCcsZymMJTfXWqRkGpeBNReNyNjEUN9HzTeX8mzbzvyzmsBWHkgwbZhGny/0/*"});
    let n3 = await KeyC.createNode({key: "020202020202020202020202020202020202020202020202020202020202020202"});
    let thresh = await ThreshC.createNode({thresh: 2, num_inputs: 4});
    let desc = await DescC.createNode();
    let addr = await AddressC.createNode({idx: 0});

    n1.position = [80, 200];
    n2.position = [80, 400];
    n3.position = [80, 570];
    thresh.position = [500, 240];
    desc.position = [800, 240];
    addr.position = [1100, 240];

    editor.addNode(n1);
    editor.addNode(n2);
    editor.addNode(n3);
    editor.addNode(thresh);
    editor.addNode(desc);
    editor.addNode(addr);

    editor.connect(n1.outputs.get('pol'), thresh.inputs.get('policies'));
    editor.connect(thresh.outputs.get('pol'), desc.inputs.get('pol'));
    editor.connect(n2.outputs.get('key'), thresh.inputs.get('policies'));
    editor.connect(n3.outputs.get('key'), thresh.inputs.get('policies'));
    editor.connect(desc.outputs.get('desc'), addr.inputs.get('desc'));

    editor.view.resize();
    AreaPlugin.zoomAt(editor);
  }

  editor.on('process nodecreated noderemoved connectioncreated connectionremoved', async () => {
    let obj = editor.toJSON();
    let h = toBase64(obj);
    window.location.hash = "/full/"+h;
    await engine.abort();
    await engine.process(obj);
    if(editor.selected.list.length){
      displayOut(editor.selected.list[0]);
    }
  });

  editor.on('nodetranslated', async () => {
    let obj = editor.toJSON();
    let h = toBase64(obj);
    window.location.hash = "/full/"+h;
  });

  editor.on('nodeselected', async (node) => {
    displayOut(editor.selected.list[0]);
  });

  editor.trigger('process');

  // on hash change
  window.addEventListener("hashchange", async ()=>{
    let obj = editor.toJSON();
    let h = toBase64(obj);
    let prevhash = "#/full/"+h;
    // external hash change
    if(window.location.hash != prevhash){
      loadHash();
    }
  }, false);

};