use napi::bindgen_prelude::*;
use napi_derive::napi;
use grass::{Options, OutputStyle};

#[napi(object)]
pub struct CompileOptions {
    pub style: Option<String>,
}

#[napi]
pub fn compile_scss_with_opts(source: String, opts: Option<CompileOptions>) -> Result<String> {
    let mut sass_opts = Options::default();

    if let Some(ref o) = opts {
        if let Some(ref style) = o.style {
            sass_opts = match style.as_str() {
                "compressed" => sass_opts.style(OutputStyle::Compressed),
                _ => sass_opts.style(OutputStyle::Expanded),
            };
        }
    }

    grass::from_string(source, &sass_opts)
        .map_err(|e| Error::from_reason(e.to_string()))
}