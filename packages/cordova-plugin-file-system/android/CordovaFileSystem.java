package com.example.listdir;

import org.apache.cordova.*;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;

public class CordovaFileSystem extends CordovaPlugin {
  @Override
  public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
    if ("listFiles".equals(action)) {
      String path = args.getString(0); // 예: "/storage/emulated/0/Download"
      File dir = new File(path);

      if (!dir.exists() || !dir.isDirectory()) {
        callbackContext.error("Directory does not exist or is not a directory.");
        return true;
      }

      File[] files = dir.listFiles();
      if (files == null) {
        callbackContext.error("Permission denied or directory not readable.");
        return true;
      }

      JSONArray result = new JSONArray();
      for (File file : files) {
        JSONObject obj = new JSONObject();
        obj.put("name", file.getName());
        obj.put("path", file.getAbsolutePath());
        obj.put("isDirectory", file.isDirectory());
        obj.put("size", file.length());
        result.put(obj);
      }

      callbackContext.success(result);
      return true;
    }

    return false;
  }
}
