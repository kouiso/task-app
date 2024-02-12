FROM mcr.microsoft.com/vscode/devcontainers/base:0-focal

# ユーザー`vscode`の作成
RUN id -u vscode &>/dev/null || useradd -m vscode -s /bin/bash && \
    echo "vscode ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/vscode && \
    chmod 0440 /etc/sudoers.d/vscode

# 開発に必要な基本ツールのインストール
# root ユーザーとして実行
RUN apt-get update && apt-get install -y curl git less man-db sudo

# Voltaのインストール
# vscode ユーザーに切り替え
USER vscode
RUN curl https://get.volta.sh | bash
ENV PATH="$PATH:/home/vscode/.volta/bin"

# `DEVCONTAINER` 環境変数を設定
ENV DEVCONTAINER=true

# .sshディレクトリのパーミッション設定
USER root
RUN mkdir -p /home/vscode/.ssh && \
    chown -R vscode:vscode /home/vscode/.ssh && \
    chmod 700 /home/vscode/.ssh
USER vscode
