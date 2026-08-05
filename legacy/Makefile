APP_NAME = MyNotion
BUNDLE   = dist/$(APP_NAME).app
BINARY   = .build/release/$(APP_NAME)

.PHONY: all build app run test icon install clean

all: app

build:
	swift build -c release

test:
	swift test

Support/AppIcon.icns:
	swift Support/make_icon.swift

icon: Support/AppIcon.icns

app: build Support/AppIcon.icns
	rm -rf $(BUNDLE)
	mkdir -p $(BUNDLE)/Contents/MacOS $(BUNDLE)/Contents/Resources
	cp $(BINARY) $(BUNDLE)/Contents/MacOS/$(APP_NAME)
	cp -R .build/release/$(APP_NAME)_$(APP_NAME).bundle $(BUNDLE)/Contents/Resources/
	cp Support/Info.plist $(BUNDLE)/Contents/Info.plist
	cp Support/AppIcon.icns $(BUNDLE)/Contents/Resources/AppIcon.icns
	printf 'APPL????' > $(BUNDLE)/Contents/PkgInfo
	codesign --force -s - $(BUNDLE)
	@echo "→ $(BUNDLE) erstellt"

run: app
	open $(BUNDLE)

install: app
	rm -rf /Applications/$(APP_NAME).app
	ditto $(BUNDLE) /Applications/$(APP_NAME).app
	@echo "→ /Applications/$(APP_NAME).app installiert"

clean:
	swift package clean
	rm -rf dist Support/AppIcon.icns
