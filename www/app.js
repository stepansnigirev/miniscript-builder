var numSocket = new Rete.Socket('Number');
var policySocket = new Rete.Socket('Policy');
var keySocket = new Rete.Socket('Key');
var descriptorSocket = new Rete.Socket('Descriptor');
var stringSocket = new Rete.Socket('String');

// helper function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

var network = "bitcoin";

/*************************** TEMPLATES *************************/

// TODO: lots of copy-paste, figure out how to simplify
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

// TODO: ugly, make label dynamic and styled in css
var VueRatioControl = {
  props: ['readonly', 'emitter', 'ikey', 'getData', 'putData'],
  template: `<div height="20px"><small style="display:block;padding-bottom:2px">Probability ratio:</small><input type="number" min="0.01" max="100" step="any" :readonly="readonly" :value="value" @change="change($event)" @keyup.enter="change($event)" @dblclick.stop="" @pointerdown.stop="" @pointermove.stop=""/></div>`,
  data() {
    return {
      value: 1,
    }
  },
  methods: {
    change(e){
      this.value = +e.target.value;
      if(this.value <= 0){
        this.value = 1;
      }
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
    if(this.value <= 0){
      this.value = 1;
    }
  }
}

var VueStringControl = {
  props: ['readonly', 'emitter', 'ikey', 'getData', 'putData'],
  template: `<input type="text" :readonly="readonly" :value="value" @change="change($event)" @keyup.enter="change($event)" @dblclick.stop="" @pointerdown.stop="" @pointermove.stop=""/>`,
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

// TODO: lots of copy-paste, figure out how to simplify
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

class RatioControl extends Rete.Control {

  constructor(emitter, key, readonly) {
    super(key);
    this.component = VueRatioControl;
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

class BIP39Component extends Rete.Component {

  constructor(){
    super("BIP39");
  }

  builder(node) {
    var out = new Rete.Output('key', "Key", keySocket);
    return node
            .addControl(new PreviewControl(this.editor, 'preview', true))
            .addControl(new StringControl(this.editor, 'mnemonic'))
            .addControl(new StringControl(this.editor, 'password'))
            .addControl(new StringControl(this.editor, 'derivation'))
            .addOutput(out);
  }

  worker(node, inputs, outputs) {
    let out = '';
    try{
      let mnemonic = (node.data.mnemonic) ? node.data.mnemonic : '';
      let password = (node.data.password) ? node.data.password : '';
      let derivation = (node.data.derivation) ? node.data.derivation : 'm';
      out = miniscript.bip39_derive(mnemonic, password, derivation, network) + "/0/*";
    }catch (e){
      out = `${e}`;
      console.error(e);
    }
    this.editor.nodes.find(n => n.id == node.id).controls.get('preview').setValue(out);
    outputs['key'] = out;
  }
}

class KeyComponent extends Rete.Component {

  constructor(){
    super("Key");
  }

  builder(node) {
    var out = new Rete.Output('key', "Policy", policySocket);
    var inp = new Rete.Input("key", "Key", keySocket);
    inp.addControl(new StringControl(this.editor, 'key'));
    return node
              .addControl(new PreviewControl(this.editor, 'preview', true))
              .addInput(inp)
              .addOutput(out);
  }

  worker(node, inputs, outputs) {
    let k = inputs['key'].length ? inputs['key'][0] : node.data.key;
    k = k ? k : '';
    let val = `pk(${k})`;
    this.editor.nodes.find(n => n.id == node.id).controls.get('preview').setValue(val);
    outputs['key'] = val;
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
        .addControl(new RatioControl(this.editor, "ratio"))
        .addOutput(out);
  }

  worker(node, inputs, outputs) {
    var ratio = (node.data.ratio) ? node.data.ratio : 1;
    let r1 = Math.round(ratio*100);
    let r2 = 100;
    // mutual reduce
    while(r1%10 == 0 && r2%10 == 0){
      r1 = Math.round(r1/10);
      r2 = Math.round(r2/10);
    }
    var p1 = inputs['pol1'].length?inputs['pol1'][0]:node.data.pol1;
    var p2 = inputs['pol2'].length?inputs['pol2'][0]:node.data.pol2;
    // handle undefined
    p1 = (p1) ? p1 : '';
    p2 = (p2) ? p2 : '';
    if(r1 != r2){
      if(r1 != 1){
        p1 = `${r1}@${p1}`;
      }
      if(r2 != 1){
        p2 = `${r2}@${p2}`;
      }
    }
    var pol = `or(${p1},${p2})`;
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

class HashComponent extends Rete.Component {
  constructor(name="SHA256"){
    super(name);
    this._op = name.toLowerCase();
  }

  builder(node) {
    // var inp = new Rete.Input('num',"Number", numSocket);
    var out = new Rete.Output('pol', "Policy", policySocket);

    return node
        .addControl(new PreviewControl(this.editor, 'preview', true))
        .addControl(new StringControl(this.editor, 'hash'))
        .addOutput(out);
  }

  worker(node, inputs, outputs) {
    var n = node.data.hash;
    n = (n==undefined) ? '' : n;
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
      addr = miniscript.address(desc, idx, network);
    }catch(e){
      addr = `Error: ${e}`;
    }
    this.editor.nodes.find(n => n.id == node.id).controls.get('preview').setValue(addr);
    outputs['addr'] = addr;
  }
}

function toBase64(obj){
  // ugly hack: inject network here
  obj.network = network;
  return btoa(JSON.stringify(obj)).replace(/\//g, '_').replace(/\+/g, '-');
}

function fromBase64(b64){
  let obj = JSON.parse(atob(b64.replace(/_/g, '/').replace(/-/g, '+')));
  return obj;
}

async function loadObj(obj){
    // get network from obj
    let net = obj.network;
    if(net != undefined){
      document.getElementById("network").value = net;
      network = net;
    }
    await editor.fromJSON(obj);
    editor.view.resize();
    AreaPlugin.zoomAt(editor);
    editor.trigger("process");
    await sleep(300);
    editor.trigger("process");
    // select descriptor by default
    let d = editor.nodes.find(n => n.name == "Descriptor");
    if(d){
      editor.selectNode(d);
    }
}

async function loadHash(){
  try{
    let obj = {};
    if(window.location.hash.startsWith("#/full/")){
      obj = fromBase64(window.location.hash.substr("#/full/".length))
    }else if(window.location.hash.startsWith("#/url/")){
      let url = window.location.hash.substr("#/url/".length);
      let res = await fetch(url);
      obj = await res.json();
    }else{
      throw "Can't parse hash";
    }
    await loadObj(obj);
  }catch(e){
    console.error(`Error: ${e}`)
  }
}

function exportJSON(el){
  let obj = editor.toJSON();
  let data = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(obj));

  el.setAttribute("href", "data:"+data);
  el.setAttribute("download", "data.json");
}
document.getElementById("jsonfile").addEventListener("change", async (e) => {
  files = e.currentTarget.files;
  for(let i=0; i<1; i++){
    let reader = new FileReader();
    reader.onload = async function(e) {
      let obj = JSON.parse(reader.result)
      await loadObj(obj);
    }
    reader.readAsText(files[i]);
  }
});

/*************************** APP MAIN *************************/

function displayOut(node){
  if(!node || !engine){
    return;
  }
  try{
    if(!engine.data){
      return;
    }
    let d = engine.data.nodes[node.id].outputData;
    let res = Object.values(d)[0];
    document.getElementById("node-name").innerText = node.name;
    document.getElementById("node-output").innerText = res;
  }catch(e){
    console.error(e);
  }
}

async function updateNetwork(){
  network = document.getElementById("network").value;
  editor.trigger('process');
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
  let Sha256_C = new HashComponent("SHA256");
  let Ripemd160_C = new HashComponent("Ripemd160");
  let Hash256_C = new HashComponent("Hash256");
  let Hash160_C = new HashComponent("Hash160");
  let BIP39_C = new BIP39Component();
  var components = [
    BIP39_C,
    KeyC,
    AfterC,
    OlderC,
    ThreshC,
    AndC,
    OrC,
    DescC,
    AddressC,
    Sha256_C,
    Ripemd160_C,
    Hash256_C,
    Hash160_C,
  ];

  window.editor = new Rete.NodeEditor('demo@0.1.0', container);
  editor.use(ConnectionPlugin.default);
  editor.use(VueRenderPlugin.default);    
  editor.use(ContextMenuPlugin.default, {
    searchBar: false,
  });
  editor.use(AreaPlugin);
  // editor.use(CommentPlugin.default);
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

  if(window.location.hash.length > 5){
    await loadHash();
  }else{
    let p1 = await OlderC.createNode({num: 12960});
    let mn = await BIP39_C.createNode({
                    mnemonic: "crash fatal hollow thank swallow submit tattoo portion code foam math force",
                    password:"",
                    derivation:"m/48h/0h/0h/2h",
    });
    let p2 = await KeyC.createNode();
    let p3 = await KeyC.createNode({key: "038b4059419fe3b95acdee6aff2f9afdca87231d14bd2cbcd3367b11d9d819a71d"});
    let thresh = await ThreshC.createNode({thresh: 2});
    let desc = await DescC.createNode();
    let addr = await AddressC.createNode({idx: 0});

    p1.position = [80, 200];
    mn.position = [-200, 400];
    p2.position = [80, 400];
    p3.position = [80, 600];
    thresh.position = [500, 240];
    desc.position = [800, 240];
    addr.position = [1100, 240];

    editor.addNode(p1);
    editor.addNode(mn);
    editor.addNode(p2);
    editor.addNode(p3);
    editor.addNode(thresh);
    editor.addNode(desc);
    editor.addNode(addr);

    editor.connect(mn.outputs.get('key'), p2.inputs.get('key'));
    editor.connect(p1.outputs.get('pol'), thresh.inputs.get('policies'));
    editor.connect(thresh.outputs.get('pol'), desc.inputs.get('pol'));
    editor.connect(p2.outputs.get('key'), thresh.inputs.get('policies'));
    editor.connect(p3.outputs.get('key'), thresh.inputs.get('policies'));
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

  // select descriptor by default
  let d = editor.nodes.find(n => n.name == "Descriptor");
  if(d){
    editor.selectNode(d);
  }
};