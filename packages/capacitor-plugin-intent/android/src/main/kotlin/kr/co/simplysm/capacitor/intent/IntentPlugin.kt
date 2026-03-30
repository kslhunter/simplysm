package kr.co.simplysm.capacitor.intent

import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Parcelable
import android.util.Log
import androidx.activity.result.ActivityResult
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.util.UUID

@CapacitorPlugin(name = "Intent")
class IntentPlugin : Plugin() {

    companion object {
        private const val TAG = "IntentPlugin"
    }

    private val receivers = mutableMapOf<String, BroadcastReceiver>()

    override fun handleOnNewIntent(intent: Intent) {
        super.handleOnNewIntent(intent)
        notifyListeners("newIntent", intentToJson(intent))
    }

    @PluginMethod(returnType = PluginMethod.RETURN_CALLBACK)
    fun subscribe(call: PluginCall) {
        try {
            val filters = call.getArray("filters")

            if (filters == null || filters.length() == 0) {
                call.reject("filters is required")
                return
            }

            call.setKeepAlive(true)

            val receiverId = UUID.randomUUID().toString()

            val intentFilter = IntentFilter()
            for (i in 0 until filters.length()) {
                intentFilter.addAction(filters.getString(i))
            }

            val receiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context, intent: Intent) {
                    val result = intentToJson(intent)
                    result.put("id", receiverId)
                    call.resolve(result)
                }
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.registerReceiver(receiver, intentFilter, Context.RECEIVER_EXPORTED)
            } else {
                context.registerReceiver(receiver, intentFilter)
            }

            receivers[receiverId] = receiver

            val ret = JSObject()
            ret.put("id", receiverId)
            call.resolve(ret)
        } catch (e: Exception) {
            Log.e(TAG, "subscribe failed", e)
            call.reject("subscribe failed: " + e.message)
        }
    }

    @PluginMethod
    fun unsubscribe(call: PluginCall) {
        try {
            val id = call.getString("id")
            if (id == null) {
                call.reject("id is required")
                return
            }

            val receiver = receivers.remove(id)
            if (receiver != null) {
                context.unregisterReceiver(receiver)
            }

            call.resolve()
        } catch (e: Exception) {
            Log.e(TAG, "unsubscribe failed", e)
            call.reject("unsubscribe failed: " + e.message)
        }
    }

    @PluginMethod
    fun unsubscribeAll(call: PluginCall) {
        try {
            for (receiver in receivers.values) {
                try {
                    context.unregisterReceiver(receiver)
                } catch (ignored: Exception) {
                }
            }
            receivers.clear()
            call.resolve()
        } catch (e: Exception) {
            Log.e(TAG, "unsubscribeAll failed", e)
            call.reject("unsubscribeAll failed: " + e.message)
        }
    }

    @PluginMethod
    fun send(call: PluginCall) {
        try {
            val action = call.getString("action")
            if (action == null) {
                call.reject("action is required")
                return
            }

            val intent = Intent(action)

            val extras = call.getObject("extras")
            if (extras != null) {
                populateExtras(intent, extras)
            }

            context.sendBroadcast(intent)
            call.resolve()
        } catch (e: Exception) {
            Log.e(TAG, "send failed", e)
            call.reject("send failed: " + e.message)
        }
    }

    @PluginMethod
    fun getLaunchIntent(call: PluginCall) {
        try {
            val intent = activity.intent
            call.resolve(intentToJson(intent))
        } catch (e: Exception) {
            Log.e(TAG, "getLaunchIntent failed", e)
            call.reject("getLaunchIntent failed: " + e.message)
        }
    }

    @PluginMethod
    fun startActivityForResult(call: PluginCall) {
        try {
            val intent = buildIntent(call)
            startActivityForResult(call, intent, "handleActivityResult")
        } catch (e: Exception) {
            Log.e(TAG, "startActivityForResult failed", e)
            call.reject("startActivityForResult failed: " + e.message)
        }
    }

    @ActivityCallback
    private fun handleActivityResult(call: PluginCall?, result: ActivityResult) {
        if (call == null) {
            return
        }

        val json = JSObject()
        json.put("resultCode", result.resultCode)

        val data = result.data
        if (data != null) {
            val dataJson = JSObject()
            if (data.action != null) {
                dataJson.put("action", data.action)
            }
            if (data.data != null) {
                dataJson.put("uri", data.data.toString())
            }
            val extras = data.extras
            if (extras != null) {
                dataJson.put("extras", bundleToJson(extras))
            }
            json.put("data", dataJson)
        }

        call.resolve(json)
    }

    private fun buildIntent(call: PluginCall): Intent {
        val intent = Intent()

        val action = call.getString("action")
        if (action != null) {
            intent.action = action
        }

        val uri = call.getString("uri")
        val type = call.getString("type")
        when {
            uri != null && type != null -> intent.setDataAndType(Uri.parse(uri), type)
            uri != null -> intent.data = Uri.parse(uri)
            type != null -> intent.type = type
        }

        val extras = call.getObject("extras")
        if (extras != null) {
            populateExtras(intent, extras)
        }

        val packageName = call.getString("packageName")
        val className = call.getString("className")
        when {
            packageName != null && className != null ->
                intent.component = ComponentName(packageName, className)
            packageName != null -> intent.setPackage(packageName)
        }

        val flags = call.getInt("flags")
        if (flags != null) {
            intent.addFlags(flags)
        }

        return intent
    }

    @Throws(JSONException::class)
    private fun populateExtras(intent: Intent, extras: JSObject) {
        val keys = extras.keys()
        while (keys.hasNext()) {
            val key = keys.next()
            val value = extras.get(key)

            when (value) {
                is String -> intent.putExtra(key, value)
                is Int -> intent.putExtra(key, value)
                is Long -> intent.putExtra(key, value)
                is Double -> intent.putExtra(key, value)
                is Boolean -> intent.putExtra(key, value)
                is JSONArray -> {
                    val strArr = Array(value.length()) { i -> value.getString(i) }
                    intent.putExtra(key, strArr)
                }
                is JSONObject -> {
                    val bundle = jsonToBundle(value)
                    intent.putExtra(key, bundle)
                }
            }
        }
    }

    @Throws(JSONException::class)
    private fun jsonToBundle(json: JSONObject): Bundle {
        val bundle = Bundle()
        val keys = json.keys()
        while (keys.hasNext()) {
            val key = keys.next()
            val value = json.get(key)

            when (value) {
                is String -> bundle.putString(key, value)
                is Int -> bundle.putInt(key, value)
                is Long -> bundle.putLong(key, value)
                is Double -> bundle.putDouble(key, value)
                is Boolean -> bundle.putBoolean(key, value)
            }
        }
        return bundle
    }

    private fun intentToJson(intent: Intent?): JSObject {
        val json = JSObject()

        if (intent == null) {
            return json
        }

        try {
            json.put("action", intent.action)

            val extras = intent.extras
            if (extras != null) {
                json.put("extras", bundleToJson(extras))
            }
        } catch (e: Exception) {
            Log.e(TAG, "intentToJson failed", e)
        }

        return json
    }

    private fun bundleToJson(bundle: Bundle?): JSObject {
        val json = JSObject()

        if (bundle == null) {
            return json
        }

        for (key in bundle.keySet()) {
            try {
                val value = bundle.get(key)

                when (value) {
                    null -> json.put(key, JSONObject.NULL)
                    is String -> json.put(key, value)
                    is Int -> json.put(key, value)
                    is Long -> json.put(key, value)
                    is Double -> json.put(key, value)
                    is Float -> json.put(key, value.toDouble())
                    is Boolean -> json.put(key, value)
                    is Bundle -> json.put(key, bundleToJson(value))
                    is Array<*> -> {
                        if (value.isArrayOf<String>()) {
                            val arr = JSArray()
                            @Suppress("UNCHECKED_CAST")
                            for (s in value as Array<String>) {
                                arr.put(s)
                            }
                            json.put(key, arr)
                        } else if (value.isArrayOf<Parcelable>()) {
                            val arr = JSArray()
                            @Suppress("UNCHECKED_CAST")
                            for (p in value as Array<Parcelable>) {
                                arr.put(p.toString())
                            }
                            json.put(key, arr)
                        } else {
                            json.put(key, value.toString())
                        }
                    }
                    is IntArray -> {
                        val arr = JSArray()
                        for (i in value) {
                            arr.put(i)
                        }
                        json.put(key, arr)
                    }
                    is Parcelable -> json.put(key, value.toString())
                    else -> json.put(key, value.toString())
                }
            } catch (e: Exception) {
                Log.w(TAG, "bundleToJson key failed: $key", e)
            }
        }

        return json
    }

    override fun handleOnDestroy() {
        for (receiver in receivers.values) {
            try {
                context.unregisterReceiver(receiver)
            } catch (ignored: Exception) {
            }
        }
        receivers.clear()
        super.handleOnDestroy()
    }
}
