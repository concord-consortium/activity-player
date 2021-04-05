"use strict";

const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const HtmlWebpackTagsPlugin = require("html-webpack-tags-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlReplaceWebpackPlugin = require('html-replace-webpack-plugin');
const GitRevPlugin = require('git-rev-webpack-plugin');
const {InjectManifest} = require('workbox-webpack-plugin');

const version = require("./package.json").version;
const gitRevPlugin = new GitRevPlugin();
const appVersionInfo = `Version ${version} (${gitRevPlugin.hash()})`;
const serviceWorkerVersionInfo = appVersionInfo; // keep the same for the build

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
      name: "Service Worker",
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
            test: /service-worker\.ts$/,
            loader: 'string-replace-loader',
            options: {
              search: '__SERVICE_WORKER_VERSION_INFO__',
              replace: serviceWorkerVersionInfo,
            }
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

    // install (auto-bundled into install.html)
    // Probably need to change the order here if we want to inject the manifest
    // in the install.js or install.html files, that way those files will
    // be built first before the InjectManifest plugin runs.
    {
      name: "AP Offline Installer",
      context: __dirname, // to automatically find tsconfig.json
      devtool: "source-map",
      entry: "./src/install.tsx",
      mode: "development",
      output: {
        filename: "assets/install.[hash].js"
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
            test: /service-worker\.ts$/,
            loader: 'string-replace-loader',
            options: {
              search: '__SERVICE_WORKER_VERSION_INFO__',
              replace: serviceWorkerVersionInfo,
            }
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
          filename: devMode ? "assets/install.css" : "assets/install.[hash].css"
        }),
        new HtmlWebpackPlugin({
          filename: "install.html",
          template: "src/install.html"
        }),
        // This adds the app-manifest with a compiliation hash like:
        // app-manifest.js?ce5603bd7ecdb0c71360
        //
        // This approach helps somewhat with caching, but because it isn't
        // part of the file name it could still cause caching problems if
        // CloudFront ignores parameters.
        // The manifest is "built" by the InjectManifest plugin, but it doesn't
        // seem to have a way to build the file with a hash in a way that
        // HtmlWebpackPlugin can inject it into install.html.
        // So this parameter based approach is the best we can do without
        // modifying or replacing InjectManfest
        new HtmlWebpackTagsPlugin({
          scripts: ["assets/app-manifest.js"],
          hash: true,
          append: false // prepend this before the main js file
        }),
        new HtmlReplaceWebpackPlugin([
          {
            pattern: '__APP_VERSION_INFO__',
            replacement: appVersionInfo
          }
        ]),
      ]
    },

    // index (auto-bundled into index.html)
    {
      name: "Main Application",
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
          swSrc: "./src/app-manifest.js",
          swDest: "assets/app-manifest.js",
          compileSrc: false,
          exclude: [
            /^offline-activities\/.*/,
            /^offline-manifests\/.*/
          ],
          additionalManifestEntries: [
            {url: "https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css", revision: null},
            {url: "https://code.jquery.com/ui/1.12.1/themes/base/images/ui-icons_444444_256x240.png", revision: null},
            {url: "https://code.jquery.com/ui/1.12.1/themes/base/images/ui-icons_555555_256x240.png", revision: null},
            {url: "https://code.jquery.com/ui/1.12.1/themes/base/images/ui-icons_ffffff_256x240.png", revision: null},
            {url: "https://code.jquery.com/ui/1.12.1/themes/base/images/ui-icons_777620_256x240.png", revision: null},
            {url: "https://code.jquery.com/ui/1.12.1/themes/base/images/ui-icons_cc0000_256x240.png", revision: null},
            {url: "https://code.jquery.com/ui/1.12.1/themes/base/images/ui-icons_777777_256x240.png", revision: null},
            {url: "https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap", revision: null},
            // These URLS might not be stable. They are referenced by the css which could be updated
            // to refer to new font files.
            {url: "https://fonts.gstatic.com/s/lato/v17/S6u9w4BMUTPHh6UVSwiPGQ3q5d0.woff2", revision: null},
            {url: "https://fonts.gstatic.com/s/lato/v17/S6uyw4BMUTPHjx4wXiWtFCc.woff2", revision: null}
          ],
          maximumFileSizeToCacheInBytes: 1024 * 1024 * 10
        })
      ]
    }

  ];
};
