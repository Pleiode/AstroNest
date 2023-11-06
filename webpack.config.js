const path = require('path');
const { ProvidePlugin } = require('webpack');
const { Buffer } = require('buffer');


module.exports = {
    mode: 'development',
    entry: './src/index.js',
    plugins: [
        // ... d'autres plugins
        new ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
        })
    ],
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js',
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: ['babel-loader'],
            },
        ],
    },
    resolve: {
        extensions: [".js", ".jsx"],
        fallback: {
            "stream": require.resolve("stream-browserify"),
            "zlib": require.resolve("browserify-zlib"),
            "net": false,  // Le module 'net' n'est généralement pas utilisé dans les navigateurs, donc vous pouvez le définir sur false
            "tls": false,  // Idem pour le module 'tls'
            "crypto": require.resolve("crypto-browserify"),
            "https": require.resolve("https-browserify"),
            "http": require.resolve("stream-http"),
            "buffer": require.resolve("buffer/"),
            "fs": false, // Vous pouvez définir "fs" sur false car il n'est pas nécessaire dans le navigateur.
            "path": require.resolve("path-browserify")
        },
        alias: {
            buffer: 'buffer'
        }
    },
};
