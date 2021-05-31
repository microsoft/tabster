module.exports = {
    launch: {
        headless: process.env.CI || false,
        devtools: process.env.CI || false,
    }
}
