#import <Foundation/Foundation.h>
#include <node_api.h>
#include <fcntl.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

// Application Scripts: a sandboxed app may run scripts the user saved in its
// scripts folder, and NSUserUnixTask runs them outside the App Sandbox. Only
// the main process carries the app's identity, so this lives in the addon.

static napi_value scriptsFolder(napi_env env, napi_callback_info info) {
    napi_value result;
    @autoreleasepool {
        NSURL *url = [NSFileManager.defaultManager URLForDirectory:NSApplicationScriptsDirectory inDomain:NSUserDomainMask appropriateForURL:nil create:NO error:nil];
        if (url) napi_create_string_utf8(env, url.fileSystemRepresentation, NAPI_AUTO_LENGTH, &result);
        else napi_get_null(env, &result);
    }
    return result;
}

static char *copyString(napi_env env, napi_value value) {
    size_t length = 0;
    if (napi_get_value_string_utf8(env, value, NULL, 0, &length) != napi_ok) return NULL;
    char *buffer = malloc(length + 1);
    if (buffer) napi_get_value_string_utf8(env, value, buffer, length + 1, &length);
    return buffer;
}

static void finished(napi_env env, napi_value callback, void *context, void *data) {
    char *message = data;
    if (env && callback) {
        napi_value undefined, argument;
        napi_get_undefined(env, &undefined);
        if (message) napi_create_string_utf8(env, message, NAPI_AUTO_LENGTH, &argument);
        else napi_get_null(env, &argument);
        napi_call_function(env, undefined, callback, 1, &argument, NULL);
    }
    free(message);
}

static void closeAll(int *fds, int count) {
    for (int i = 0; i < count; i++) if (fds[i] >= 0) close(fds[i]);
}

// run(path, args, done) → { stdin, stdout, stderr }: the caller's pipe ends.
// done(error | null) fires once the script has exited.
static napi_value run(napi_env env, napi_callback_info info) {
    size_t argc = 3;
    napi_value argv[3];
    napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
    if (argc < 3) { napi_throw_type_error(env, NULL, "run(path, args, done)"); return NULL; }
    @autoreleasepool {
        char *path = copyString(env, argv[0]);
        if (!path) { napi_throw_type_error(env, NULL, "The script path must be a string"); return NULL; }
        NSURL *url = [NSURL fileURLWithPath:@(path)];
        free(path);
        NSMutableArray<NSString *> *arguments = [NSMutableArray array];
        uint32_t count = 0;
        napi_get_array_length(env, argv[1], &count);
        for (uint32_t i = 0; i < count; i++) {
            napi_value item;
            napi_get_element(env, argv[1], i, &item);
            char *text = copyString(env, item);
            if (!text) { napi_throw_type_error(env, NULL, "Script arguments must be strings"); return NULL; }
            [arguments addObject:@(text)];
            free(text);
        }
        NSError *error = nil;
        NSUserUnixTask *task = [[NSUserUnixTask alloc] initWithURL:url error:&error];
        if (!task) {
            napi_throw_error(env, NULL, error.localizedDescription.UTF8String ?: "The script cannot be opened");
            return NULL;
        }
        // [0]/[1] stdin, [2]/[3] stdout, [4]/[5] stderr (read end, write end)
        int fds[6] = { -1, -1, -1, -1, -1, -1 };
        if (pipe(fds) || pipe(fds + 2) || pipe(fds + 4)) {
            closeAll(fds, 6);
            napi_throw_error(env, NULL, strerror(errno));
            return NULL;
        }
        for (int i = 0; i < 6; i++) fcntl(fds[i], F_SETFD, FD_CLOEXEC);
        task.standardInput = [[NSFileHandle alloc] initWithFileDescriptor:fds[0] closeOnDealloc:NO];
        task.standardOutput = [[NSFileHandle alloc] initWithFileDescriptor:fds[3] closeOnDealloc:NO];
        task.standardError = [[NSFileHandle alloc] initWithFileDescriptor:fds[5] closeOnDealloc:NO];
        napi_threadsafe_function done;
        napi_value name;
        napi_create_string_utf8(env, "Merkzeug script", NAPI_AUTO_LENGTH, &name);
        if (napi_create_threadsafe_function(env, argv[2], NULL, name, 0, 1, NULL, NULL, NULL, finished, &done) != napi_ok) {
            closeAll(fds, 6);
            napi_throw_error(env, NULL, "Cannot watch the script");
            return NULL;
        }
        int scriptIn = fds[0], scriptOut = fds[3], scriptErr = fds[5];
        [task executeWithArguments:arguments completionHandler:^(NSError *failure) {
            char *message = failure ? strdup(failure.localizedDescription.UTF8String ?: "The script failed") : NULL;
            // our copies of the script's ends: closing them lets the caller see EOF
            close(scriptIn); close(scriptOut); close(scriptErr);
            napi_call_threadsafe_function(done, message, napi_tsfn_blocking);
            napi_release_threadsafe_function(done, napi_tsfn_release);
        }];
        napi_value result, value;
        napi_create_object(env, &result);
        napi_create_int32(env, fds[1], &value); napi_set_named_property(env, result, "stdin", value);
        napi_create_int32(env, fds[2], &value); napi_set_named_property(env, result, "stdout", value);
        napi_create_int32(env, fds[4], &value); napi_set_named_property(env, result, "stderr", value);
        return result;
    }
}

void registerScripts(napi_env env, napi_value exports) {
    napi_value fn;
    napi_create_function(env, "scriptsFolder", NAPI_AUTO_LENGTH, scriptsFolder, NULL, &fn);
    napi_set_named_property(env, exports, "scriptsFolder", fn);
    napi_create_function(env, "runScript", NAPI_AUTO_LENGTH, run, NULL, &fn);
    napi_set_named_property(env, exports, "runScript", fn);
}
