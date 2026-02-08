{
  pkgs,
  lib,
  ...
}:
{
  dotenv.enable = true;

  # Disable helm plugins to avoid warnings polluting cdk8s helm template output
  env = {
    HELM_PLUGINS = "";
  };

  languages.javascript = {
    enable = true;
    npm.enable = true;
    package = pkgs.nodejs_22;
  };

  languages.typescript.enable = true;

  packages = with pkgs; [
    ansible
    backblaze-b2
    cdk8s-cli
    kubectl
    kubernetes-helm
    just
    samba
    bws
    sqlite
    cook-cli
  ];

  scripts.b2.exec = "backblaze-b2 $@";

  git-hooks.hooks = {
    nixfmt.enable = true;
    check-shebang-scripts-are-executable.enable = true;
    check-symlinks.enable = true;
    check-yaml.enable = true;
    ripsecrets.enable = true;
    shellcheck.enable = true;
    shfmt.enable = true;
    trim-trailing-whitespace.enable = true;
    end-of-file-fixer.enable = true;
  };

}
