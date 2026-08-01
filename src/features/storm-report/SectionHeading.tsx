import { Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { styles } from "./styles";

export function SectionHeading({ title, meta }: { title: string; meta: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.sectionHeading}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      <Text numberOfLines={1} style={[styles.sectionMeta, { color: theme.textFaint }]}>{meta}</Text>
    </View>
  );
}
