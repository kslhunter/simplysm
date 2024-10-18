/**
 * 참고코드: https://github.com/magnusja/libaums/blob/cc71b9654ac2ea0ee713f06b26d9eb01fa88b515/androidtests/src/androidTest/java/me/jahnen/libaums/core/androidtests/LibAumsTest.kt#L14
 */

package kr.co.simplysm.cordova;

import android.annotation.SuppressLint;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbManager;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaWebView;
import org.apache.cordova.PluginResult;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.nio.ByteBuffer;
import java.util.Arrays;
import java.util.Optional;

import me.jahnen.libaums.core.UsbMassStorageDevice;
import me.jahnen.libaums.core.fs.FileSystem;
import me.jahnen.libaums.core.fs.UsbFile;
import me.jahnen.libaums.core.fs.UsbFileInputStream;

public class SdUsbStorage extends CordovaPlugin {
  private static final String ACTION_USB_PERMISSION = "kr.co.simplysm.usb-storage.USB_PERMISSION";

  public Context context;

  @Override
  public void initialize(CordovaInterface cordova, CordovaWebView webView) {
    this.context = cordova.getActivity().getApplicationContext();
  }

  @SuppressLint("UnspecifiedRegisterReceiverFlag")
  @Override
  public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
    try {
      if (action.equals("getDevices")) {
        UsbMassStorageDevice[] devices = UsbMassStorageDevice.getMassStorageDevices(this.context);

        JSONArray result = new JSONArray();
        for (UsbMassStorageDevice device : devices) {
          UsbDevice usbDevice = device.getUsbDevice();

          JSONObject resultObj = new JSONObject();
          resultObj.put("deviceName", usbDevice.getDeviceName());
          resultObj.put("manufacturerName", usbDevice.getManufacturerName());
          resultObj.put("productName", usbDevice.getProductName());
          resultObj.put("vendorId", usbDevice.getVendorId());
          resultObj.put("productId", usbDevice.getProductId());
          result.put(resultObj);
        }

        callbackContext.success(result);

        return true;
      }
      else if (action.equals("requestPermission")) {
        int vendorId = args.getInt(0);
        int productId = args.getInt(1);

        UsbMassStorageDevice device = this.getDevice(vendorId, productId);
        UsbDevice usbDevice = device.getUsbDevice();

        UsbManager usbManager = (UsbManager) this.context.getSystemService(Context.USB_SERVICE);
        if (!usbManager.hasPermission(usbDevice)) {
          this.context.registerReceiver(new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
              try {
                if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
                  callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, true));
                }
                else {
                  callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, false));
                }
              }
              catch (Exception e) {
                callbackContext.error(getStack(e));
              }
            }
          }, new IntentFilter(ACTION_USB_PERMISSION));

          PendingIntent permissionIntent = PendingIntent.getBroadcast(this.context, 0, new Intent(ACTION_USB_PERMISSION), 0);
          usbManager.requestPermission(usbDevice, permissionIntent);
        }
        else {
          callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, true));
        }
        return true;
      }
      else if (action.equals("hasPermission")) {
        int vendorId = args.getInt(0);
        int productId = args.getInt(1);

        UsbMassStorageDevice device = this.getDevice(vendorId, productId);

        UsbManager usbManager = (UsbManager) this.context.getSystemService(Context.USB_SERVICE);
        boolean hasPermission = usbManager.hasPermission(device.getUsbDevice());
        callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, hasPermission));
        return true;
      }
      else if (action.equals("readdir")) {
        int vendorId = args.getInt(0);
        int productId = args.getInt(1);
        String path = args.getString(2);

        UsbMassStorageDevice device = this.getDevice(vendorId, productId);

        UsbManager usbManager = (UsbManager) this.context.getSystemService(Context.USB_SERVICE);
        if (!usbManager.hasPermission(device.getUsbDevice())) {
          throw new Exception("USB 장치에 대한 접근 권한이 없습니다.");
        }

        device.init();

        FileSystem fs = device.getPartitions().get(0).getFileSystem();
        UsbFile root = fs.getRootDirectory();
        UsbFile dir = root.search(path);
        UsbFile[] files = dir.listFiles();

        JSONArray result = new JSONArray();
        for (UsbFile file : files) {
          result.put(file.getName());
        }

        callbackContext.success(result);
        return true;
      }
      else if (action.equals("read")) {
        int vendorId = args.getInt(0);
        int productId = args.getInt(1);
        String path = args.getString(2);

        UsbMassStorageDevice device = this.getDevice(vendorId, productId);

        UsbManager usbManager = (UsbManager) this.context.getSystemService(Context.USB_SERVICE);
        if (!usbManager.hasPermission(device.getUsbDevice())) {
          throw new Exception("USB 장치에 대한 접근 권한이 없습니다.");
        }

        device.init();

        FileSystem fs = device.getPartitions().get(0).getFileSystem();
        UsbFile root = fs.getRootDirectory();
        UsbFile usbFile = root.search(path);
        if (usbFile == null) {
          callbackContext.success();
          return true;
        }
        if (usbFile.isDirectory()) {
          throw new Exception("해당 경로는 폴더입니다.");
        }

        ByteBuffer buffer = ByteBuffer.allocate((int) usbFile.getLength());

        UsbFileInputStream inputStream = new UsbFileInputStream(usbFile);
        byte[] tmpBuf = new byte[fs.getChunkSize()];
        int count = 0;
        while ((count = inputStream.read(tmpBuf)) != -1) {
          buffer.put(tmpBuf, 0, count);
        }
        inputStream.close();
        callbackContext.success(buffer.array());
        return true;
      }
    }
    catch (Exception e) {
      callbackContext.error(getStack(e));
    }
    return false;
  }

  private String getStack(Exception exception) {
    StringWriter sw = new StringWriter();
    exception.printStackTrace(new PrintWriter(sw));
    return sw.toString().replace("\t", "  ");
  }

  private UsbMassStorageDevice getDevice(int vendorId, int productId) throws Exception {
    UsbMassStorageDevice[] devices = UsbMassStorageDevice.getMassStorageDevices(this.context);
    Optional<UsbMassStorageDevice> optDevice = Arrays.stream(devices).filter((tmpDevice) -> {
      UsbDevice tmpUsbDevice = tmpDevice.getUsbDevice();
      return tmpUsbDevice.getVendorId() == vendorId && tmpUsbDevice.getProductId() == productId;
    }).findFirst();

    if (!optDevice.isPresent()) {
      throw new Exception("USB 장치를 찾을 수 없습니다.");
    }
    return optDevice.get();
  }
}