# Miniscript playground

WORK IN PROGRESS

WASM + [rust-miniscript](https://github.com/rust-bitcoin/rust-miniscript) + [rete.js](https://github.com/retejs/rete) = miniscript node editor

Try online: [miniscript.fun](https://miniscript.fun)

![](screenshot.png)

## Roadmap

Planned:

- [x] all policy op-codes
- [x] address derivation
- [x] automatic url encoding of full editor state (`#/full/b64-encoded-json`)
- [x] node inspector with node output
- [x] bip39 and DescriptorKey nodes (mnemonic to root key, then derive with path and select allowed derivation)
- [x] network selector (bitcoin / testnet / regtest / signet)
- [ ] use sortedmulti instead of multi
- [ ] allow aliases for keys (any string instead of a valid (x)pub)
- [ ] build nodes from url with policy (`#/policy/andor(blah(blah))`)
- [ ] build nodes from url with descriptor (`#/descriptor/wsh(andor(blah(blah)))`) - uplift?
- [ ] simple miniscript wallet using block explorer
  - [ ] fetch balances
  - [ ] create psbt
  - [ ] finalize psbt
  - [ ] Specter-DIY QR support
- [ ] allow xprv and WIF keys?
- [ ] taproot and tapscript
- [ ] wpkh, sh(wsh), sh(wpkh)
