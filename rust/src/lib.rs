use wasm_bindgen::prelude::*;
use std::str::FromStr;

use miniscript::bitcoin::{self, secp256k1};
use miniscript::bitcoin::util::bip32::{
    ExtendedPrivKey, ExtendedPubKey, DerivationPath
};
use miniscript::policy::Concrete;
use miniscript::{Descriptor, DescriptorPublicKey, TranslatePk2, DescriptorTrait};

use bip39::Mnemonic;

// https://github.com/rustwasm/wasm-bindgen/issues/1742#issuecomment-643793491
macro_rules! jserr {
    ($expression:expr) => {
        match $expression {
            Ok(a) => a,
            Err(e) => {
                return Err(JsValue::from(format!("{}", e)));
            }
        }
    };
}

#[wasm_bindgen]
pub fn compile(policy: &str) -> Result<JsValue, JsValue>{
    let policy = jserr!(Concrete::<DescriptorPublicKey>::from_str(policy));
    let minisc = jserr!(Descriptor::new_wsh(jserr!(policy.compile())));
    Ok(minisc.to_string().into())
}

#[wasm_bindgen]
pub fn address(desc: &str, idx: u32, network: &str) -> Result<JsValue, JsValue>{
    let network = jserr!(network.parse::<bitcoin::Network>());
    if idx >= 0x80000000 {
        return Err(JsValue::from("Invalid index"));
    }
    let secp_ctx = secp256k1::Secp256k1::verification_only();
    let desc = jserr!(Descriptor::<DescriptorPublicKey>::from_str(desc));
    let desc = jserr!(desc.derive(idx).translate_pk2(|xpk| xpk.derive_public_key(&secp_ctx).map(bitcoin::PublicKey::new)));
    let addr = jserr!(desc.address(network));
    Ok(addr.to_string().into())
}

#[wasm_bindgen]
pub fn bip39_root(mnemonic: &str, password: &str, network: &str) -> Result<JsValue, JsValue> {
    let network = jserr!(network.parse::<bitcoin::Network>());
    let mnemonic = jserr!(Mnemonic::parse(mnemonic));
    let seed = mnemonic.to_seed(password);

    // generate root bip-32 key from seed
    let root = jserr!(ExtendedPrivKey::new_master(network, &seed));

    let secp_ctx = secp256k1::Secp256k1::new();
    let fingerprint = root.fingerprint(&secp_ctx);
    Ok(format!("[{}]{}", fingerprint, root).into())
}

#[wasm_bindgen]
pub fn bip39_derive(mnemonic: &str, password: &str, path: &str, network: &str) -> Result<JsValue, JsValue> {
    let network = jserr!(network.parse::<bitcoin::Network>());
    let mnemonic = jserr!(Mnemonic::parse(mnemonic));
    let seed = mnemonic.to_seed(password);
    let derivation = jserr!(DerivationPath::from_str(path));

    // generate root bip-32 key from seed
    let secp_ctx = secp256k1::Secp256k1::new();
    let root = jserr!(ExtendedPrivKey::new_master(network, &seed));
    let fingerprint = root.fingerprint(&secp_ctx);

    let child = jserr!(root.derive_priv(&secp_ctx, &derivation));
    let xpub = ExtendedPubKey::from_priv(&secp_ctx, &child);
    let key = format!("[{}{}]{}", fingerprint, &path[1..], xpub);

    Ok(key.into())
}