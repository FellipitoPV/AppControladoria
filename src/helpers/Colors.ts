import { ColorValue } from "react-native";

interface ColorScheme {
    text: ColorValue;
    primary: ColorValue;
    secondary: ColorValue;
    black: ColorValue;
    gray: ColorValue;
    yellow: ColorValue;
    green: ColorValue;
    red: ColorValue;
    blue: ColorValue;
    white: ColorValue;
    background: ColorValue;
    lightBackground: ColorValue;
}

const Colors: ColorScheme = {
    text: "#333333",
    primary: "#366871",
    secondary: "#88f170",
    black: "black",
    gray: "gray",
    yellow: "yellow",
    green: "green",
    red: "red",
    blue: "blue",
    white: "white",
    background: "rgb(0, 105, 113)",
    lightBackground: "#E8E8E8",
};

export default Colors;