package kr.co.simplysm.capacitor.broadcast;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.Bundle;
import android.os.Parcelable;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@CapacitorPlugin(name = "Broadcast")
public class BroadcastPlugin extends Plugin {

    private static final String TAG = "BroadcastPlugin";
    private final Map<String, BroadcastReceiver> receivers = new HashMap<>();

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        notifyListeners("onNewIntent", intentToJson(intent));
    }

    @PluginMethod(returnType = PluginMethod.RETURN_CALLBACK)
    public void subscribe(PluginCall call) {
        try {
            JSArray filters = call.getArray("filters");

            if (filters == null || filters.length() == 0) {
                call.reject("filters is required");
                return;
            }

            call.setKeepAlive(true);

            String receiverId = UUID.randomUUID().toString();

            IntentFilter intentFilter = new IntentFilter();
            for (int i = 0; i < filters.length(); i++) {
                intentFilter.addAction(filters.getString(i));
            }

            BroadcastReceiver receiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    JSObject result = intentToJson(intent);
                    result.put("id", receiverId);
                    call.resolve(result);
                }
            };

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                getContext().registerReceiver(receiver, intentFilter, Context.RECEIVER_EXPORTED);
            } else {
                getContext().registerReceiver(receiver, intentFilter);
            }

            receivers.put(receiverId, receiver);

            JSObject ret = new JSObject();
            ret.put("id", receiverId);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "subscribe failed", e);
            call.reject("subscribe failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void unsubscribe(PluginCall call) {
        try {
            String id = call.getString("id");
            if (id == null) {
                call.reject("id is required");
                return;
            }

            BroadcastReceiver receiver = receivers.remove(id);
            if (receiver != null) {
                getContext().unregisterReceiver(receiver);
            }

            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "unsubscribe failed", e);
            call.reject("unsubscribe failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void unsubscribeAll(PluginCall call) {
        try {
            for (BroadcastReceiver receiver : receivers.values()) {
                try {
                    getContext().unregisterReceiver(receiver);
                } catch (Exception ignored) {
                }
            }
            receivers.clear();
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "unsubscribeAll failed", e);
            call.reject("unsubscribeAll failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void send(PluginCall call) {
        try {
            String action = call.getString("action");
            if (action == null) {
                call.reject("action is required");
                return;
            }

            Intent intent = new Intent(action);

            JSObject extras = call.getObject("extras");
            if (extras != null) {
                populateExtras(intent, extras);
            }

            getContext().sendBroadcast(intent);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "send failed", e);
            call.reject("send failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getLaunchIntent(PluginCall call) {
        try {
            Intent intent = getActivity().getIntent();
            call.resolve(intentToJson(intent));
        } catch (Exception e) {
            Log.e(TAG, "getLaunchIntent failed", e);
            call.reject("getLaunchIntent failed: " + e.getMessage());
        }
    }

    private void populateExtras(Intent intent, JSObject extras) throws JSONException {
        Iterator<String> keys = extras.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            Object value = extras.get(key);

            if (value instanceof String) {
                intent.putExtra(key, (String) value);
            } else if (value instanceof Integer) {
                intent.putExtra(key, (Integer) value);
            } else if (value instanceof Long) {
                intent.putExtra(key, (Long) value);
            } else if (value instanceof Double) {
                intent.putExtra(key, (Double) value);
            } else if (value instanceof Boolean) {
                intent.putExtra(key, (Boolean) value);
            } else if (value instanceof JSONArray) {
                JSONArray arr = (JSONArray) value;
                String[] strArr = new String[arr.length()];
                for (int i = 0; i < arr.length(); i++) {
                    strArr[i] = arr.getString(i);
                }
                intent.putExtra(key, strArr);
            } else if (value instanceof JSONObject) {
                Bundle bundle = jsonToBundle((JSONObject) value);
                intent.putExtra(key, bundle);
            }
        }
    }

    private Bundle jsonToBundle(JSONObject json) throws JSONException {
        Bundle bundle = new Bundle();
        Iterator<String> keys = json.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            Object value = json.get(key);

            if (value instanceof String) {
                bundle.putString(key, (String) value);
            } else if (value instanceof Integer) {
                bundle.putInt(key, (Integer) value);
            } else if (value instanceof Long) {
                bundle.putLong(key, (Long) value);
            } else if (value instanceof Double) {
                bundle.putDouble(key, (Double) value);
            } else if (value instanceof Boolean) {
                bundle.putBoolean(key, (Boolean) value);
            }
        }
        return bundle;
    }

    private JSObject intentToJson(Intent intent) {
        JSObject json = new JSObject();

        if (intent == null) {
            return json;
        }

        try {
            json.put("action", intent.getAction());

            Bundle extras = intent.getExtras();
            if (extras != null) {
                json.put("extras", bundleToJson(extras));
            }
        } catch (Exception e) {
            Log.e(TAG, "intentToJson failed", e);
        }

        return json;
    }

    private JSObject bundleToJson(Bundle bundle) {
        JSObject json = new JSObject();

        if (bundle == null) {
            return json;
        }

        for (String key : bundle.keySet()) {
            try {
                Object value = bundle.get(key);

                if (value == null) {
                    json.put(key, JSONObject.NULL);
                } else if (value instanceof String) {
                    json.put(key, value);
                } else if (value instanceof Integer) {
                    json.put(key, value);
                } else if (value instanceof Long) {
                    json.put(key, value);
                } else if (value instanceof Double) {
                    json.put(key, value);
                } else if (value instanceof Float) {
                    json.put(key, ((Float) value).doubleValue());
                } else if (value instanceof Boolean) {
                    json.put(key, value);
                } else if (value instanceof Bundle) {
                    json.put(key, bundleToJson((Bundle) value));
                } else if (value instanceof String[]) {
                    JSArray arr = new JSArray();
                    for (String s : (String[]) value) {
                        arr.put(s);
                    }
                    json.put(key, arr);
                } else if (value instanceof int[]) {
                    JSArray arr = new JSArray();
                    for (int i : (int[]) value) {
                        arr.put(i);
                    }
                    json.put(key, arr);
                } else if (value instanceof Parcelable) {
                    json.put(key, value.toString());
                } else if (value instanceof Parcelable[]) {
                    JSArray arr = new JSArray();
                    for (Parcelable p : (Parcelable[]) value) {
                        arr.put(p.toString());
                    }
                    json.put(key, arr);
                } else {
                    json.put(key, value.toString());
                }
            } catch (Exception e) {
                Log.w(TAG, "bundleToJson key failed: " + key, e);
            }
        }

        return json;
    }

    @Override
    protected void handleOnDestroy() {
        for (BroadcastReceiver receiver : receivers.values()) {
            try {
                getContext().unregisterReceiver(receiver);
            } catch (Exception ignored) {
            }
        }
        receivers.clear();
        super.handleOnDestroy();
    }
}
