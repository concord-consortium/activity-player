"use strict";

const path = require("path");

const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlReplaceWebpackPlugin = require("html-replace-webpack-plugin");
const GitRevPlugin = require("git-rev-webpack-plugin");

const version = require("./package.json").version;
const webpack = require("webpack");
const gitRevPlugin = new GitRevPlugin();
const appVersionInfo = `Version ${version} (${gitRevPlugin.hash()})`;

// DEPLOY_PATH is set by the s3-deploy-action its value will be:
// `branch/[branch-name]/` or `version/[tag-name]/`
const DEPLOY_PATH = process.env.DEPLOY_PATH;

module.exports = (env, argv) => {
  const devMode = argv.mode !== "production";

  return {
    context: __dirname, // to automatically find tsconfig.json
    devtool: "source-map",
    entry: "./src/index.tsx",
    mode: "development",
    output: {
      filename: "assets/index.[hash].js",
      hashFunction: "sha512"
    },
    performance: { hints: false },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          enforce: "pre",
          use: [
            {
              loader: "eslint-loader",
              options: {}
            }
          ]
        },
        {
          test: /\.tsx?$/,
          loader: "ts-loader"
        },
        {
          test: /\.(sa|sc|c)ss$/i,
          use: [
            devMode ? "style-loader" : MiniCssExtractPlugin.loader,
            {
              loader: "css-loader",
              options: {
                modules: {
                  // required for :import from scss files
                  // cf. https://github.com/webpack-contrib/css-loader#separating-interoperable-css-only-and-css-module-features
                  compileType: "icss"
                }
              }
            },
            "postcss-loader",
            "sass-loader"
          ]
        },
        {
          test: /\.(png|woff|woff2|eot|ttf)$/,
          type: "asset",
          parser: {
            dataUrlCondition: {
              maxSize: 8192
            }
          }
        },
        {
          test: /\.svg$/,
          oneOf: [
            {
              // Do not apply SVGR import in CSS files.
              issuer: /\.(css|scss|less)$/,
              type: "asset",
              parser: {
                dataUrlCondition: {
                  maxSize: 8192
                }
              }
            },
            {
              issuer: /\.tsx?$/,
              loader: "@svgr/webpack"
            }
          ]
        },
        // This code coverage instrumentation should only be added when needed. It makes
        // the code larger and slower
        process.env.CODE_COVERAGE ? {
          test: /\.[tj]sx?$/,
          use: {
            loader: "@jsdevtools/coverage-istanbul-loader",
            options: { esModules: true },
          },
          enforce: "post",
          // I"m not sure but I don"t think it is necessary to exclude the cypress and
          // tests folder. I think Jest does its own loading of tests. And cypress does
          // its own loading of cypress
          exclude: /node_modules|\.spec\.js$/,

        } : {}
      ]
    },
    resolve: {
      extensions: [ ".ts", ".tsx", ".js" ],
      fallback: {
        "buffer": require.resolve("buffer/"),
        "crypto": require.resolve("crypto-browserify"),
        "querystring": require.resolve("querystring-es3"),
        "stream": require.resolve("stream-browserify"),
        "util": require.resolve("util")
      },
      alias: {
        // this allows local npm link to work without causing duplicate react imports
        react: path.resolve(__dirname, './node_modules/react')
      },
    },
    stats: {
      // suppress "export not found" warnings about re-exported types
      warningsFilter: /export .* was not found in/
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: devMode ? "assets/index.css" : "assets/index.[hash].css"
      }),
      new HtmlWebpackPlugin({
        filename: "index.html",
        template: "src/index.html"
      }),
      ...(DEPLOY_PATH ? [new HtmlWebpackPlugin({
        filename: "index-top.html",
        template: "src/index.html",
        publicPath: DEPLOY_PATH,
      })] : []),
      new HtmlReplaceWebpackPlugin([
        {
          pattern: '__APP_VERSION_INFO__',
          replacement: appVersionInfo
        }
      ]),
      new CopyWebpackPlugin({
        patterns: [
          {from: "src/public"}
        ]
      }),
      new webpack.ProvidePlugin({
        process: "process/browser",
      }),
    ]
  };
};
