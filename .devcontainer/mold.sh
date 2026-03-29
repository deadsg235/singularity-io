#!/bin/bash

set -e  # Exit immediately if a command exits with a non-zero status

echo "[INFO] Step 1: Determining system architecture..."
ARCH="$(uname -m)-linux"
echo "[INFO] Architecture determined: $ARCH"
echo "[INFO] Step 1 completed."

echo "[INFO] Step 2: Fetching download URL for latest release..."
DOWNLOAD_URL=$(curl -s https://api.github.com/repos/rui314/mold/releases/latest \
  | jq -r --arg arch "$ARCH" '.assets[] | select(.name | endswith(".tar.gz") and test($arch)) | .browser_download_url')
echo "[INFO] Download URL: $DOWNLOAD_URL"
echo "[INFO] Step 2 completed."

echo "[INFO] Step 3: Downloading the tar.gz file..."
curl -sL -o /tmp/mold.tar.gz "$DOWNLOAD_URL"
echo "[INFO] File downloaded to /tmp/mold.tar.gz"
echo "[INFO] Step 3 completed."

echo "[INFO] Step 4: Extracting the tarball..."
tar -xf /tmp/mold.tar.gz -C /tmp
EXTRACTED_DIR=$(tar -tzf /tmp/mold.tar.gz | head -1 | cut -f1 -d"/")
echo "[INFO] Extracted directory: /tmp/$EXTRACTED_DIR"
echo "[INFO] Step 4 completed."

echo "[INFO] Step 5: Copying binaries to /usr/bin/..."
sudo cp /tmp/$EXTRACTED_DIR/bin/* /usr/bin/
echo "[INFO] Binaries copied to /usr/bin/"
echo "[INFO] Step 5 completed."

echo "[INFO] All steps completed successfully."
