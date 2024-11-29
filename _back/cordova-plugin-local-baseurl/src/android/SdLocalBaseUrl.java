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
import java.io.PrintWriter;
import java.io.StringWriter;


public class SdLocalBaseUrl extends CordovaPlugin {
    @Override
    public boolean execute(String action, JSONArray data, CallbackContext callbackContext) throws JSONException {
      if (action.equals("setUrl")) {
        String url = data.getString(0);

        try {
          String ionicWebViewEngineUrlPath = new URI(url).getPath();
          String ionicWebViewEngineServerPath = ionicWebViewEngineUrlPath.substring(0, ionicWebViewEngineUrlPath.indexOf("/index.html"));

          try {
            Class ionicWebViewEngineClass = Class.forName("com.ionicframework.cordova.webview.IonicWebViewEngine");
            final Object ionicWebViewEngine = ionicWebViewEngineClass.cast(webView.getEngine());
            final Method setServerBasePath = ionicWebViewEngineClass.getMethod("setServerBasePath", String.class);

            cordova.getActivity().runOnUiThread(new Runnable() {
              @Override
              public void run() {
                try {
                  setServerBasePath.invoke(ionicWebViewEngine, ionicWebViewEngineServerPath);
                  callbackContext.success();
                } catch (IllegalAccessException e) {
                  callbackContext.error(getStack(e));
                } catch (InvocationTargetException e) {
                  callbackContext.error(getStack(e));
                }
              }
            });
          } catch (ClassNotFoundException e) {
            webView.loadUrlIntoView(url, false);
          } catch (NoSuchMethodException e) {
            callbackContext.error(getStack(e));
            return false;
          }
        } catch (URISyntaxException e) {
          callbackContext.error(getStack(e) + "(" + url + ")");
          return false;
        }

        return true;
      } else if (action.equals("getUrl")) {
        try{
          Class ionicWebViewEngineClass = Class.forName("com.ionicframework.cordova.webview.IonicWebViewEngine");
          final Object ionicWebViewEngine = ionicWebViewEngineClass.cast(webView.getEngine());
          final Method getServerBasePath = ionicWebViewEngineClass.getMethod("getServerBasePath", String.class);

          cordova.getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
              try {
                String serverBasePath = getServerBasePath.invoke(ionicWebViewEngine, []);
                callbackContext.success(serverBasePath);
              } catch (IllegalAccessException e) {
                callbackContext.error(getStack(e));
              } catch (InvocationTargetException e) {
                callbackContext.error(getStack(e));
              }
            }
          });
        } catch (ClassNotFoundException e) {
          callbackContext.error(getStack(e));
          return false;
        } catch (NoSuchMethodException e) {
          callbackContext.error(getStack(e));
          return false;
        }

        return true;
      } else {
        return false;
      }
    }

    public String getStack(Exception exception) {
        StringWriter sw = new StringWriter();
        exception.printStackTrace(new PrintWriter(sw));
        return sw.toString().replace("\t", "  ");
    }
}