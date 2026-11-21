module.exports = {
  content: ["./app/**/*.tsx", "./components/**/*.tsx"],
  theme: {
    extend: {
      colors: { brand: { black: "#171717", red: "#F21B2B", bg: "#F5F5F5", border: "#E5E7EB", text: "#202020", muted: "#737373" } },
      boxShadow: { card: "0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)" }
    }
  }
};
