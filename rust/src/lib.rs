use wasm_bindgen::prelude::*;
use std::str::FromStr;

use miniscript::bitcoin::{self, secp256k1};
use miniscript::policy::Concrete;
use miniscript::{Descriptor, DescriptorPublicKey, TranslatePk2, DescriptorTrait};

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
pub fn address(desc: &str, idx: u32) -> Result<JsValue, JsValue>{
    if idx >= 0x80000000 {
        return Err(JsValue::from("Invalid index"));
    }
    let secp_ctx = secp256k1::Secp256k1::verification_only();
    let desc = jserr!(Descriptor::<DescriptorPublicKey>::from_str(desc));
    let desc = jserr!(desc.derive(idx).translate_pk2(|xpk| xpk.derive_public_key(&secp_ctx).map(bitcoin::PublicKey::new)));
    let addr = jserr!(desc.address(bitcoin::Network::Bitcoin));
    Ok(addr.to_string().into())
}