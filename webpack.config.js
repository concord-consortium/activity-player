"use strict";

const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlReplaceWebpackPlugin = require('html-replace-webpack-plugin');
const GitRevPlugin = require('git-rev-webpack-plugin');
const {InjectManifest} = require('workbox-webpack-plugin');

const version = require("./package.json").version;
const gitRevPlugin = new GitRevPlugin();
const appVersionInfo = `Version ${version} (${gitRevPlugin.hash()})`;

module.exports = (env, argv) => {
  const devMode = argv.mode !== "production";

  // This proxies the rewritten models-resources urls
  // NOTE: the devServer config has to show up in the first entry returned for it to work
  const devServer = {
    proxy: {
      "**/models-resources/**": {
        target: "http://models-resources.concord.org",
        secure: false,
        changeOrigin: true,
        pathRewrite: {"^.*/models-resources": ""},
        logLevel: "debug"
      }
    }
  };

  return [
    // service-worker (not auto-bundled but registered in app)
    {
      context: __dirname, // to automatically find tsconfig.json
      devtool: "inline-source-map",
      entry: "./src/service-worker.ts",
      mode: "development",
      output: {
        globalObject: 'this',
        filename: "./service-worker.js" // NOTE: no hash is added to the output
      },
      module: {
        rules: [
          {
            test: /\.ts$/,
            enforce: "pre",
            use: [
              {
                loader: "eslint-loader",
                options: {}
              }
            ]
          },
          {
            test: /\.ts$/,
            loader: "ts-loader",
            options: {
              onlyCompileBundledFiles: true,
              compilerOptions: {
                sourceMap: true
              }
            },
          }
        ]
      },
      resolve: {
        extensions: [ ".ts", ".js" ]
      },
      devServer
    },

    // index (auto-bundled into index.html)
    {
      context: __dirname, // to automatically find tsconfig.json
      devtool: "source-map",
      entry: "./src/index.tsx",
      mode: "development",
      output: {
        filename: "assets/index.[hash].js"
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
            loader: "url-loader",
            options: {
              limit: 8192
            }
          },
          {
            test: /\.svg$/,
            oneOf: [
              {
                // Do not apply SVGR import in CSS files.
                issuer: /\.(css|scss|less)$/,
                use: "url-loader"
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
              loader: "istanbul-instrumenter-loader",
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
        extensions: [ ".ts", ".tsx", ".js" ]
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
        new InjectManifest({
          swSrc: "./src/service-worker.ts",
          maximumFileSizeToCacheInBytes: 1024 * 1024 * 10
        })
      ]
    }
  ];
};
