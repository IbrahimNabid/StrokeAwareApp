import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  View,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import {
  TextInput,
  Button,
  Text,
  Card,
  HelperText,
  Snackbar,
  Avatar,
  Dialog,
  Portal,
  Appbar,
  useTheme,
  Checkbox,
} from "react-native-paper";

// Define all options for the form
const GENDERS = [
  { label: "Male (assigned at birth)", value: "Male", icon: "gender-male", accent: "#4e9cff" },
  { label: "Female (assigned at birth)", value: "Female", icon: "gender-female", accent: "#f484b9" },
  { label: "Another sex / Intersex", value: "Other", icon: "gender-non-binary", accent: "#b28eff" },
];

const WORK_TYPES = [
  { label: "Private Sector", value: "Private", icon: "briefcase", accent: "#4e9cff" },
  { label: "Self-employed", value: "Self-employed", icon: "account", accent: "#7dd173" },
  { label: "Government Job", value: "Govt_job", icon: "office-building", accent: "#faca58" },
  { label: "Never Worked", value: "Never_worked", icon: "minus-circle", accent: "#cfcfcf" },
  { label: "Child (underage)", value: "children", icon: "baby-face-outline", accent: "#b28eff" },
];
const RESIDENCE_TYPES = [
  { label: "Urban", value: "Urban", icon: "city", accent: "#4e9cff" },
  { label: "Rural", value: "Rural", icon: "home", accent: "#7dd173" },
  { label: "Suburban", value: "Suburban", icon: "home-city-outline", accent: "#faca58" },
];
const SMOKING_STATUSES = [
  { label: "Never smoked", value: "never smoked", icon: "smoking-off", accent: "#7dd173" },
  { label: "Formerly smoked", value: "formerly smoked", icon: "smoking", accent: "#faca58" },
  { label: "Smokes", value: "smokes", icon: "smoking", accent: "#ff8888" },
  { label: "Unknown", value: "Unknown", icon: "help-circle", accent: "#b2b8cf" },
];
const YESNO = [
  { label: "Yes", value: 1, icon: "check-circle", accent: "#7dd173" },
  { label: "No", value: 0, icon: "close-circle", accent: "#ff8888" },
];

// --- Type for backend response
type PredictionResult = {
  probability: number;
  prediction: number;
  probability_str?: string;
  model_votes?: { knn: number; rf: number; lr: number };
  model_probs?: { knn: number; rf: number; lr: number };
};

export default function IndexScreen() {
  const theme = useTheme();

  // Form state
  const [gender, setGender] = useState("Male");
  const [age, setAge] = useState("");
  const [bmi, setBMI] = useState("");
  const [hypertension, setHypertension] = useState("0");
  const [heartDisease, setHeartDisease] = useState("0");
  const [everMarried, setEverMarried] = useState("0");
  const [workType, setWorkType] = useState("Private");
  const [residenceType, setResidenceType] = useState("Urban");
  const [avgGlucoseLevel, setAvgGlucoseLevel] = useState("");
  const [smokingStatus, setSmokingStatus] = useState("never smoked");
  const [consent, setConsent] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState("");
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);

  // --- Input Validation
  const isNumeric = (val: string) => /^(\d+\.?\d*)?$/.test(val);
  const validate = (): string => {
    if (!age || !isNumeric(age) || Number(age) < 1 || Number(age) > 120)
      return "Enter a valid age (1-120).";
    if (!bmi || !isNumeric(bmi) || Number(bmi) < 10 || Number(bmi) > 80)
      return "Enter a valid BMI (10-80).";
    if (
      avgGlucoseLevel &&
      (!isNumeric(avgGlucoseLevel) ||
        Number(avgGlucoseLevel) < 30 ||
        Number(avgGlucoseLevel) > 300)
    )
      return "Glucose must be between 30-300 (optional)";
    if (!smokingStatus) return "Please select your smoking status.";
    if (!consent) return "You must agree to the disclaimer.";
    return "";
  };

  // --- Handle Prediction Submit
  const onSubmit = async () => {
    const validationMsg = validate();
    if (validationMsg) {
      setError(validationMsg);
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const payload = {
        gender,
        age: Number(age),
        hypertension: Number(hypertension),
        heart_disease: Number(heartDisease),
        ever_married: everMarried === "1" ? "Yes" : "No",
        work_type: workType,
        Residence_type: residenceType,
        avg_glucose_level: avgGlucoseLevel ? Number(avgGlucoseLevel) : null,
        bmi: Number(bmi),
        smoking_status: smokingStatus,
      };

      const response = await fetch("http://192.168.0.147:8000/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Could not get prediction");
      const data: PredictionResult = await response.json();
      setResult(data);
    } catch (e) {
      setError("Failed to get prediction. Please try again.");
    }
    setLoading(false);
  };

  // --- Display helper for Probability
  function getProbabilityDisplay(result: PredictionResult | null) {
    if (!result) return <ActivityIndicator size={12} color="#1a3365" />;
    if (typeof result.probability_str === "string" && result.probability_str.trim().length > 0)
      return result.probability_str;
    if (
      typeof result.probability === "number" &&
      !isNaN(result.probability) &&
      result.probability >= 0 &&
      result.probability <= 100
    )
      return `${result.probability.toFixed(2)}%`;
    // Show user-friendly fallback (never N/A)
    return "Cannot Calculate";
  }

  // --- Render Option Groups
  function OptionGroup({ value, setValue, options, row = true }: any) {
    return (
      <View style={[styles.optionsRow, row ? {} : { flexDirection: "column" }]}>
        {options.map((opt: any) => (
          <Button
            key={opt.value}
            mode={value === opt.value ? "contained" : "outlined"}
            onPress={() => setValue(opt.value)}
            icon={opt.icon}
            style={[
              styles.optionButton,
              { borderColor: opt.accent },
              value === opt.value && {
                backgroundColor: opt.accent + "11",
                borderColor: opt.accent,
              },
            ]}
            labelStyle={{
              color: value === opt.value ? opt.accent : "#1a3365",
              fontWeight: value === opt.value ? "bold" : "600",
              fontSize: 16,
              marginLeft: 4,
            }}
            contentStyle={{ flexDirection: "row-reverse", justifyContent: "flex-start" }}
            accessibilityState={{ selected: value === opt.value }}
          >
            {opt.label}
          </Button>
        ))}
      </View>
    );
  }

  // --- UI Rendering
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f6f8fd" }}>
      <Appbar style={styles.appbar}>
        <Appbar.Content title="Stroke Risk" titleStyle={styles.headerTitle} />
        <Appbar.Action icon="alert-circle-outline" color="#fff" onPress={() => setShowDisclaimer(true)} />
      </Appbar>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Gender */}
          <Card style={[styles.sectionCard, { borderLeftColor: "#4e9cff" }]}>
            <Text style={styles.sectionStep}>Step 1</Text>
            <Text style={styles.sectionTitle}>What was your sex assigned at birth?</Text>
            <Text style={styles.infoText}>
              <Text style={{ color: "#3d63d6", fontWeight: "700" }}>Why?</Text> This is only for medical risk calculation. We support everyone's gender identity.
            </Text>
            <OptionGroup value={gender} setValue={setGender} options={GENDERS} />
          </Card>
          {/* Age & BMI */}
          <Card style={[styles.sectionCard, { borderLeftColor: "#faca58" }]}>
            <Text style={styles.sectionStep}>Step 2</Text>
            <Text style={styles.sectionTitle}>Your Age & BMI</Text>
            <TextInput
              label="Age"
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              style={styles.input}
              left={<TextInput.Icon icon="calendar" />}
              maxLength={3}
              mode="outlined"
              placeholder="Years (1-120)"
            />
            <HelperText type="error" visible={!!age && (!isNumeric(age) || Number(age) < 1 || Number(age) > 120)}>
              Age must be 1-120
            </HelperText>
            <TextInput
              label="BMI"
              value={bmi}
              onChangeText={setBMI}
              keyboardType="numeric"
              style={styles.input}
              left={<TextInput.Icon icon="human-male-height" />}
              placeholder="e.g. 23.4"
              mode="outlined"
            />
            <HelperText type="error" visible={!!bmi && (!isNumeric(bmi) || Number(bmi) < 10 || Number(bmi) > 80)}>
              BMI must be 10-80
            </HelperText>
          </Card>
          {/* Medical History */}
          <Card style={[styles.sectionCard, { borderLeftColor: "#7dd173" }]}>
            <Text style={styles.sectionStep}>Step 3</Text>
            <Text style={styles.sectionTitle}>Medical History</Text>
            <Text style={styles.questionLabel}>Hypertension (high blood pressure):</Text>
            <OptionGroup value={hypertension} setValue={setHypertension} options={YESNO} row={false} />
            <Text style={styles.questionLabel}>Heart Disease:</Text>
            <OptionGroup value={heartDisease} setValue={setHeartDisease} options={YESNO.map(x => ({ ...x, icon: x.label === "Yes" ? "heart" : "heart-outline" }))} row={false} />
            <Text style={styles.questionLabel}>Ever married?</Text>
            <OptionGroup value={everMarried} setValue={setEverMarried} options={YESNO.map(x => ({ ...x, icon: "ring" }))} row={false} />
          </Card>
          {/* Lifestyle & Residence */}
          <Card style={[styles.sectionCard, { borderLeftColor: "#b28eff" }]}>
            <Text style={styles.sectionStep}>Step 4</Text>
            <Text style={styles.sectionTitle}>Lifestyle & Residence</Text>
            <Text style={styles.questionLabel}>Work Type:</Text>
            <OptionGroup value={workType} setValue={setWorkType} options={WORK_TYPES} row={false} />
            <Text style={styles.questionLabel}>Residence Type:</Text>
            <OptionGroup value={residenceType} setValue={setResidenceType} options={RESIDENCE_TYPES} />
            <Text style={styles.questionLabel}>Smoking Status:</Text>
            <OptionGroup value={smokingStatus} setValue={setSmokingStatus} options={SMOKING_STATUSES} />
          </Card>
          {/* Metabolic */}
          <Card style={[styles.sectionCard, { borderLeftColor: "#f484b9" }]}>
            <Text style={styles.sectionStep}>Step 5</Text>
            <Text style={styles.sectionTitle}>Metabolic Markers</Text>
            <TextInput
              label="Avg. Glucose Level (optional)"
              value={avgGlucoseLevel}
              onChangeText={setAvgGlucoseLevel}
              keyboardType="numeric"
              style={styles.input}
              mode="outlined"
              left={<TextInput.Icon icon="water" />}
              placeholder="80 - 200"
            />
            <HelperText type="info" visible={true}>If unknown, leave blank.</HelperText>
          </Card>
          {/* Disclaimer */}
          <TouchableOpacity
            style={[
              styles.disclaimerRow,
              consent && styles.disclaimerRowChecked,
            ]}
            onPress={() => setConsent((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consent }}
            activeOpacity={0.7}
          >
            <Checkbox
              status={consent ? "checked" : "unchecked"}
              onPress={() => setConsent((v) => !v)}
              color="#204b81"
              uncheckedColor="#b2b8cf"
            />
            <Text style={styles.disclaimerText}>
              I have read and agree to the
              <Text style={styles.disclaimerLink} onPress={() => setShowDisclaimer(true)}>
                {" "}medical disclaimer
              </Text>
              .
            </Text>
          </TouchableOpacity>
          {/* Submit */}
          <Button
            mode="contained"
            icon="magnify"
            onPress={onSubmit}
            style={styles.button}
            disabled={loading || !consent}
            loading={loading}
            contentStyle={{ paddingVertical: 10 }}
            labelStyle={{ fontWeight: "bold", fontSize: 18, letterSpacing: 1 }}
          >
            Predict Stroke Risk
          </Button>
          {/* Prediction Card */}
          {result && (
            <Card
              style={[
                styles.resultCard,
                {
                  backgroundColor: result.prediction === 1 ? "#ffe5e6" : "#e7f4ec",
                  borderColor: result.prediction === 1 ? "#ff7377" : "#5ed196",
                },
              ]}
              elevation={4}
              onPress={() => setDetailsVisible(true)}
            >
              <Card.Content>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Avatar.Icon
                    icon={result.prediction === 1 ? "alert" : "shield-check"}
                    size={44}
                    style={{
                      backgroundColor: result.prediction === 1 ? "#ff7377" : "#53d492",
                    }}
                    color="white"
                  />
                  <View style={{ marginLeft: 14 }}>
                    <Text style={{
                      fontSize: 19,
                      fontWeight: "bold",
                      color: result.prediction === 1 ? "#cc1b36" : "#067c4e"
                    }}>
                      {result.prediction === 1 ? "High Risk" : "Low Risk"}
                    </Text>
                    <Text style={{
                      fontSize: 16,
                      color: "#555",
                      marginTop: 2,
                    }}>
                      Estimated Chance:{" "}
                      <Text style={{
                        fontWeight: "bold",
                        color: result.prediction === 1 ? "#c93125" : "#1e9656",
                      }}>
                        {getProbabilityDisplay(result)}
                      </Text>
                    </Text>
                    {/* ADVANCED: Show ensemble breakdown if present */}
                    {result.model_probs && (
                      <Text style={{
                        fontSize: 12,
                        color: "#888",
                        marginTop: 2,
                        fontStyle: "italic"
                      }}>
                        Model Avg: KNN {result.model_probs.knn.toFixed(1)}%, RF {result.model_probs.rf.toFixed(1)}%, LR {result.model_probs.lr.toFixed(1)}%
                      </Text>
                    )}
                  </View>
                </View>
                <Text style={{
                  fontSize: 12,
                  marginTop: 10,
                  color: "#7c7c7c"
                }}>
                  Tap for details & tips.
                </Text>
              </Card.Content>
            </Card>
          )}
          {/* Error Snackbar */}
          <Snackbar
            visible={!!error}
            onDismiss={() => setError("")}
            duration={3500}
            style={{ backgroundColor: "#e53935" }}
          >
            {error}
          </Snackbar>
          {/* Disclaimer Modal */}
          <Portal>
            <Dialog
              visible={showDisclaimer}
              onDismiss={() => setShowDisclaimer(false)}
            >
              <Dialog.Icon icon="alert-circle" />
              <Dialog.Title style={{ color: "#c9332d" }}>Medical Disclaimer</Dialog.Title>
              <Dialog.Content>
                <Text style={{ fontSize: 16, color: "#222", marginBottom: 8 }}>
                  <Text style={{ fontWeight: "bold" }}>This app does not provide medical advice.</Text>{"\n"}
                  The risk estimates shown here are for informational and educational purposes only.
                </Text>
                <Text style={{ fontSize: 15, color: "#555" }}>
                  This tool is based on statistical data and cannot replace a medical evaluation or diagnosis by a licensed healthcare provider. If you have urgent symptoms (such as sudden numbness, severe headache, confusion, vision loss, or difficulty speaking), <Text style={{ fontWeight: "bold", color: "#c9332d" }}>seek emergency medical care immediately</Text>.
                  {"\n\n"}
                  By using this app, you agree that the results are for planning and awareness, and not for diagnosis or treatment.
                </Text>
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={() => setShowDisclaimer(false)} mode="contained" style={{ borderRadius: 20 }}>
                  I Understand
                </Button>
              </Dialog.Actions>
            </Dialog>
          </Portal>
          {/* Details Modal */}
          <Portal>
            <Dialog
              visible={detailsVisible}
              onDismiss={() => setDetailsVisible(false)}
              style={{ borderRadius: 24 }}
            >
              <Dialog.Title style={{ color: "#3257d6", fontWeight: "bold" }}>About Your Result</Dialog.Title>
              <Dialog.Content>
                <Text style={{ fontSize: 15, marginBottom: 10 }}>
                  <Text style={{ fontWeight: "bold" }}>
                    {result && (result.prediction === 1 ? "High Risk" : "Low Risk")}
                  </Text>
                  {" "}of stroke based on the data you provided.
                </Text>
                <Text style={{ fontSize: 14, color: "#444", marginBottom: 12 }}>
                  <Text style={{ fontWeight: "bold" }}>What to do:</Text>{" "}
                  {result && result.prediction === 1
                    ? "Please discuss with your doctor and focus on improving modifiable risk factors such as blood pressure, cholesterol, glucose control, exercise, and quitting smoking if applicable."
                    : "Continue healthy lifestyle habits and regular checkups. This estimate is not a substitute for a doctor's assessment."}
                </Text>
                <Button
                  onPress={() => setDetailsVisible(false)}
                  style={{ marginTop: 4 }}
                  icon="close"
                  mode="contained-tonal"
                >
                  Close
                </Button>
              </Dialog.Content>
            </Dialog>
          </Portal>
          <View style={{ height: 80 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  appbar: {
    backgroundColor: "#203462",
    elevation: 0,
    paddingTop: 10,
    paddingBottom: 6,
    minHeight: 64,
    justifyContent: "center",
  },
  headerTitle: {
    fontWeight: "bold",
    color: "white",
    fontSize: 23,
    alignSelf: "center",
  },
  container: {
    padding: 18,
    paddingBottom: 60,
    backgroundColor: "transparent",
    alignItems: "stretch",
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#23346d22",
    shadowOpacity: 0.10,
    shadowRadius: 7,
    elevation: 2,
    borderLeftWidth: 7,
  },
  sectionStep: {
    color: "#b2b8cf",
    fontWeight: "700",
    marginBottom: 2,
    fontSize: 15,
    letterSpacing: 1,
  },
  sectionTitle: {
    marginBottom: 8,
    color: "#1a3365",
    fontWeight: "bold",
    fontSize: 18,
  },
  infoText: {
    color: "#5c5d63",
    fontSize: 14,
    marginBottom: 5,
  },
  input: {
    marginBottom: 6,
    backgroundColor: "#f7fafd",
    fontSize: 16,
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginVertical: 7,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  optionButton: {
    minWidth: 145,
    margin: 4,
    borderRadius: 14,
    borderWidth: 2,
    backgroundColor: "#f8f9fd",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  questionLabel: {
    marginTop: 8,
    marginBottom: 2,
    fontWeight: "600",
    color: "#1a3365",
    fontSize: 15,
  },
  disclaimerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e6ebf8",
    marginTop: 3,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  disclaimerRowChecked: {
    borderColor: "#3257d6",
    backgroundColor: "#e6eeff",
  },
  disclaimerText: {
    fontSize: 15,
    color: "#222",
    flex: 1,
    marginLeft: 4,
  },
  disclaimerLink: {
    color: "#3257d6",
    textDecorationLine: "underline",
    fontWeight: "600",
  },
  button: {
    marginTop: 14,
    marginBottom: 16,
    borderRadius: 18,
    backgroundColor: "#3257d6",
    elevation: 2,
  },
  resultCard: {
    marginTop: 25,
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    elevation: 4,
  },
});










