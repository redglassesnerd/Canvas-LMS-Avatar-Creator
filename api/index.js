export default (req, res) => {
    res.sendFile('public/index.html', { root: process.cwd() });
  };
  