package kr.co.simplysm.cordova;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;

import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;

import java.net.URI;
import java.net.URISyntaxException;
import java.lang.reflect.Method;
import java.lang.reflect.InvocationTargetException;

public class SdLocalBaseUrl extends CordovaPlugin {
    @Override
    public boolean execute(String action, JSONArray data, CallbackContext callbackContext) throws JSONException {
      if (action.equals("setUrl")) {
        String url = data.toString(0);

        try {
          String ionicWebViewEngineUrlPath = new URI(url).getPath();
          String ionicWebViewEngineServerPath = ionicWebViewEngineUrlPath.substring(0, ionicWebViewEngineUrlPath.indexOf("/index.html"));

          try {
            Class ionicWebViewEngineClass = Class.forName("com.ionicframework.cordova.webview.IonicWebViewEngine");
            final Object ionicWebViewEngine = ionicWebViewEngineClass.cast(webView.getEngine());
            final Method setServerBasePath = ionicWebViewEngineClass.getMethod("setServerBasePath", String.class);

            this.cordova.getActivity().runOnUiThread(new Runnable() {
              @Override
              public void run() {
                try {
                  setServerBasePath.invoke(ionicWebViewEngine, ionicWebViewEngineServerPath);
                } catch (IllegalAccessException e) {
                  Log.d("SdLocalBaseUrl", "ERR: ", e);
                } catch (InvocationTargetException e) {
                  Log.d("SdLocalBaseUrl", "ERR: ", e);
                }
              }
            });
          } catch (ClassNotFoundException e) {
            Log.d("SdLocalBaseUrl", "ERR: ", e);
            webView.loadUrlIntoView(url, false);
          } catch (NoSuchMethodException e) {
            Log.d("SdLocalBaseUrl", "ERR: ", e);
          }
        } catch (URISyntaxException e) {
          Log.d("SdLocalBaseUrl", "ERR: ", e);
        }

        return true;
      } else {
        return false;
      }
    }
}