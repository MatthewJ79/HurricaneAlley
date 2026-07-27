import { StyleSheet, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

const trackColors = [
  "#31D6DB",
  "#F472B6",
  "#38BDF8",
  "#F59E0B",
  "#A78BFA",
  "#34D399",
  "#FB7185",
  "#C084FC",
  "#67E8F9",
];

export function StormMap({
  models = false,
  cone = false,
  height = 280,
}: {
  models?: boolean;
  cone?: boolean;
  height?: number;
}) {
  const lineCount = models ? 18 : 4;
  return (
    <View style={[styles.wrapper, { height }]}>
      <Svg width="100%" height="100%" viewBox="0 0 390 320">
        <Defs>
          <LinearGradient id="sea" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#071924" />
            <Stop offset="1" stopColor="#02080E" />
          </LinearGradient>
          <RadialGradient id="cloud">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
            <Stop offset=".2" stopColor="#D7E3E7" stopOpacity=".95" />
            <Stop offset=".55" stopColor="#9BAFB5" stopOpacity=".55" />
            <Stop offset="1" stopColor="#6E8791" stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="cone" x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0" stopColor="#00DEDF" stopOpacity=".17" />
            <Stop offset=".5" stopColor="#FFFFFF" stopOpacity=".62" />
            <Stop offset="1" stopColor="#00DEDF" stopOpacity=".2" />
          </LinearGradient>
        </Defs>
        <Rect width="390" height="320" fill="url(#sea)" />
        {Array.from({ length: 8 }).map((_, index) => (
          <Line key={`v-${index}`} x1={index * 55} y1="0" x2={index * 55} y2="320" stroke="#31566A" strokeOpacity=".25" />
        ))}
        {Array.from({ length: 7 }).map((_, index) => (
          <Line key={`h-${index}`} x1="0" y1={index * 52} x2="390" y2={index * 52} stroke="#31566A" strokeOpacity=".25" />
        ))}
        <Path d="M292 0c-5 23 5 42-2 58-8 18-30 27-26 47 3 16 22 27 9 43-17 20-48 15-61 35-10 16 4 29-5 44-10 16-38 18-52 36-12 15-12 32-25 55" fill="none" stroke="#9CB1B8" strokeWidth="1.4" />
        <Path d="M342 0c-2 25 13 43 8 66-4 22-26 29-18 49 8 24 38 25 48 50" fill="none" stroke="#9CB1B8" strokeWidth="1.4" />
        {!models ? (
          <G>
            <Ellipse cx="204" cy="201" rx="82" ry="66" fill="url(#cloud)" />
            <Circle cx="204" cy="201" r="11" fill="#15303C" />
            <Path d="M208 192c37-31 76-5 66 27M200 210c-36 30-76 4-65-28M213 204c29 37 3 76-30 64M195 197c-29-37-3-76 30-64" fill="none" stroke="#EDF4F6" strokeOpacity=".78" strokeWidth="12" strokeLinecap="round" />
          </G>
        ) : null}
        {cone ? (
          <G>
            <Path d="M205 200 L298 42 L327 54 L224 214 Z" fill="url(#cone)" stroke="#00DADD" strokeWidth="1.5" />
            {[55, 82, 112].map((r) => (
              <Circle key={r} cx="204" cy="201" r={r} fill="none" stroke="#00DADD" strokeWidth="1.4" />
            ))}
          </G>
        ) : null}
        {Array.from({ length: lineCount }).map((_, index) => {
          const drift = (index - lineCount / 2) * (models ? 5.4 : 2);
          return (
            <Path
              key={index}
              d={`M ${28 + drift / 2} 290 C ${88 + drift} 244, ${151 + drift * 0.4} 229, 213 ${176 + drift * 0.55} S ${310 + drift} 94, ${362 + drift * 0.55} 35`}
              fill="none"
              stroke={models ? trackColors[index % trackColors.length] : "#00DDE2"}
              strokeWidth={models ? 1.1 : 2}
              strokeOpacity={models ? 0.85 : index === 2 ? 1 : 0.35}
            />
          );
        })}
        {!models ? (
          <>
            <SvgText x="272" y="106" fill="#D5E1E4" fontSize="8">TAMPA</SvgText>
            <SvgText x="315" y="272" fill="#D5E1E4" fontSize="8">MIAMI</SvgText>
          </>
        ) : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: "100%", overflow: "hidden", backgroundColor: "#06131C" },
});
