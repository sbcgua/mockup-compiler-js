<!-- markdownlint-disable no-bare-urls -->
# SEA notes

## Useful

- https://notes.billmill.org/programming/javascript/Making_a_single-file_executable_with_node_and_esbuild.html
- https://dev.to/zavoloklom/how-to-build-multi-platform-executable-binaries-in-nodejs-with-sea-rollup-docker-and-github-d0g
- https://stackoverflow.com/questions/70662886/how-to-bundle-node-js-application-to-single-executable-application-sea-along-n
- https://nodejs.org/api/single-executable-applications.html

## Caveats

postject and --sentinel-fuse must be outside of package.json to avoid
"Error: Multiple occurences of sentinel "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2" found in the binary"

## Signing

- https://stackoverflow.com/questions/84847/how-do-i-create-a-self-signed-certificate-for-code-signing-on-windows

## Icons

- https://github.com/nodejs/single-executable/discussions/67
- Resource Hacker (https://angusj.com/resourcehacker/)
- https://www.npmjs.com/package/resedit-cli

- http://www.free-icon-editor.com/ (but russian)
- https://redketchup.io/icon-editor (online)
- https://www.xiconeditor.com/

## JS SIGNTOOLS

- https://github.com/Ylianst/Authenticode-JS - does not work properly and not an installable bin
- https://www.npmjs.com/search?q=Authenticode

## SIGNTOOL

- https://stackoverflow.com/questions/252226/signing-a-windows-exe-file
signtool sign /a /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 MyFile.exe

- https://developer.microsoft.com/en-gb/windows/downloads/windows-sdk/
- https://learn.microsoft.com/en-us/windows/win32/seccrypto/signtool
- https://stackoverflow.com/questions/31869552/how-to-install-signtool-exe-for-windows-10?newreg=4ed08a28e10e45f6b0ba564b07578716

Extract:

    If you only want SignTool and really want to minimize the install, here is a way that I just reverse-engineered my way to:

    Download the .iso file from https://developer.microsoft.com/en-us/windows/downloads/windows-10-sdk (current download link is http://go.microsoft.com/fwlink/p/?LinkID=2022797) The .exe download will not work, since it's an online installer that pulls down its dependencies at runtime.
    Unpack the .iso with a tool such as 7-zip.
    Install the Installers/Windows SDK Signing Tools-x86_en-us.msi file - it's only 388 KiB large. For reference, it pulls in its files from the following .cab files, so these are also needed for a standalone install:
    4c3ef4b2b1dc72149f979f4243d2accf.cab (339 KiB)
    685f3d4691f444bc382762d603a99afc.cab (1002 KiB)
    e5c4b31ff9997ac5603f4f28cd7df602.cab (389 KiB)
    e98fa5eb5fee6ce17a7a69d585870b7c.cab (1.2 MiB)
    There we go - you will now have the signtool.exe file and companions in C:\Program Files (x86)\Windows Kits\10\bin\10.0.17763.0\x64 (replace x64 with x86, arm or arm64 if you need it for another CPU architecture.)

    It is also possible to commit signtool.exe and the other files from this folder into your version control repository if want to use it in e.g. CI scenarios. I have tried it and it seems to work fine.

    (All files are probably not necessary since there are also some other .exe tools in this folder that might be responsible for these dependencies, but I am not sure which ones could be removed to make the set of files even smaller. Someone else is free to investigate further in this area. :) I tried to just copy signtool.* and that didn't work, so at least some of the other files are needed.)
