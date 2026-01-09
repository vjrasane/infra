{
  pkgs,
  ...
}:
{
  dotenv.enable = true;

  # Disable helm plugins to avoid warnings polluting cdk8s helm template output
  env.HELM_PLUGINS = "";

  languages.javascript = {
    enable = true;
    npm.enable = true;
    package = pkgs.nodejs_22;
  };

  languages.typescript.enable = true;

  packages = [
    pkgs.backblaze-b2
    pkgs.cdk8s-cli
    pkgs.kubectl
    pkgs.kubernetes-helm
    pkgs.just
  ];

  scripts.b2.exec = "backblaze-b2 $@";

  pre-commit.hooks = {
    nixfmt-rfc-style.enable = true;
    check-shebang-scripts-are-executable.enable = true;
    check-symlinks.enable = true;
    check-yaml.enable = true;
    ripsecrets.enable = true;
    shellcheck.enable = true;
    shfmt.enable = true;
    typos.enable = true;
    trim-trailing-whitespace.enable = true;
    end-of-file-fixer.enable = true;
  };

}
