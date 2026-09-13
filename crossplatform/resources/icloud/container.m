#import <Foundation/Foundation.h>
#include <node_api.h>
#include <stdlib.h>
#include <string.h>

// Run in Electron's main process: the sandbox extension belongs to the process
// that calls URLForUbiquityContainerIdentifier, not to a separate helper.
typedef struct { napi_async_work work; napi_deferred deferred; char *path; } Request;
static void discover(napi_env env, void *data) {
    Request *request = data;
    @autoreleasepool {
        if (NSFileManager.defaultManager.ubiquityIdentityToken == nil) return;
        NSURL *url = [NSFileManager.defaultManager URLForUbiquityContainerIdentifier:@"iCloud.com.creative-it.merkzeug"];
        if (url) request->path = strdup(url.fileSystemRepresentation);
    }
}
static void complete(napi_env env, napi_status status, void *data) {
    Request *request = data;
    napi_value result;
    if (status == napi_ok && request->path) napi_create_string_utf8(env, request->path, NAPI_AUTO_LENGTH, &result);
    else napi_get_null(env, &result);
    napi_resolve_deferred(env, request->deferred, result);
    napi_delete_async_work(env, request->work);
    free(request->path); free(request);
}
static napi_value container(napi_env env, napi_callback_info info) {
    Request *request = calloc(1, sizeof(Request));
    if (!request) { napi_throw_error(env, NULL, "Cannot allocate iCloud request"); return NULL; }
    napi_value promise, name;
    napi_create_promise(env, &request->deferred, &promise);
    napi_create_string_utf8(env, "Merkzeug iCloud container", NAPI_AUTO_LENGTH, &name);
    napi_create_async_work(env, NULL, name, discover, complete, request, &request->work);
    napi_queue_async_work(env, request->work);
    return promise;
}
NAPI_MODULE_INIT() {
    napi_value fn;
    napi_create_function(env, "container", NAPI_AUTO_LENGTH, container, NULL, &fn);
    napi_set_named_property(env, exports, "container", fn);
    return exports;
}
