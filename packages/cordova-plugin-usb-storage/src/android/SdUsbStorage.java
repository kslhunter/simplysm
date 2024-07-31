package kr.co.simplysm.cordova;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;

import org.json.JSONArray;
import org.json.JSONException;

import android.app.PendingIntent;
import android.content.Context;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.nio.file.FileSystem;
import java.util.Arrays;
import java.util.concurrent.TimeoutException;

import android.hardware.usb.UsbDevice;

import me.jahnen.libaums.core.UsbMassStorageDevice;

public class SdUsbStorage extends CordovaPlugin {
  @Override
  public boolean execute(String action, JSONArray data, CallbackContext callbackContext) throws JSONException {
    try {
      if (action.equals("getDevices")) {
        Context context = cordova.getContext();
        UsbManager usbManager = (UsbManager) context.getSystemService(Context.USB_SERVICE);
        UsbMassStorageDevice[] devices = UsbMassStorageDevice.getMassStorageDevices(context);

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
      } else if (action.equals("requestPermission")) {
        int vendorId = args.getInt(0);
        int productId = args.getInt(1);

        Context context = cordova.getContext();
        UsbManager usbManager = (UsbManager) context.getSystemService(Context.USB_SERVICE);
        UsbMassStorageDevice[] devices = UsbMassStorageDevice.getMassStorageDevices(context);
        UsbDevice usbDevice = Arrays.stream(devices).findFirst((device) -> {
          UsbDevice usbDevice = device.getUsbDevice();
          return usbDevice.getVendorId() == vendorId && usbDevice.getProductId() == productId;
        });

        if (usbDevice == null) {
          throw new Exception("USB 장치를 찾을 수 없습니다.");
        }

        if (!usbManager.hasPermission(usbDevice)) {
          PendingIntent permissionIntent = PendingIntent.getBroadcast(context, 0,
              new Intent("kr.co.simplysm.usb-storage.USB_PERMISSION"), 0);
          usbManager.requestPermission(usbDevice, permissionIntent);

          long startWaitPermissionTime = System.currentTimeMillis();
          while (!usbManager.hasPermission(usbDevice)
              && System.currentTimeMillis() < startWaitPermissionTime + (30 * 1000)) {
            Thread.sleep(500);
          }
          if (!usbManager.hasPermission(usbDevice)) {
            throw new TimeoutException("USB 장치에 대한 권한을 얻지 못했습니다.");
          }
        }

        callbackContext.success();
        return true;
      } else if (action.equals("readdir")) {
        int vendorId = args.getInt(0);
        int productId = args.getInt(1);
        int path = args.getString(2);

        Context context = cordova.getContext();
        UsbManager usbManager = (UsbManager) context.getSystemService(Context.USB_SERVICE);
        UsbMassStorageDevice[] devices = UsbMassStorageDevice.getMassStorageDevices(context);
        UsbDevice usbDevice = Arrays.stream(devices).findFirst((device) -> {
          UsbDevice usbDevice = device.getUsbDevice();
          return usbDevice.getVendorId() == vendorId && usbDevice.getProductId() == productId;
        });

        device.init();
        FileSystem fs = device.getPartitions().get(0).getFileSystem();
        UsbFile root = fs.getRootDirectory();
        UsbFile dir = root.search(path);
        UsbFile[] files = dir.listFiles();
        for (UsbFile file : files) {
          executeGlobalJavascript("console.log(\"" + file.getName() + "\");");
        }

        callbackContext.success();
        return true;
      }
    } catch (Exception e) {
      callbackContext.error(getStack(e));
    }
    return false;
  }

  public String getStack(Exception exception) {
    StringWriter sw = new StringWriter();
    exception.printStackTrace(new PrintWriter(sw));
    return sw.toString().replace("\t", "  ");
  }
}