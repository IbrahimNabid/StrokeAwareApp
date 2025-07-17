import pandas as pd
import numpy as np
import os
import joblib

from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, roc_auc_score
from imblearn.over_sampling import SMOTE

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.join(BASE_DIR, "healthcare-dataset-stroke-data.csv")
model_path = os.path.join(BASE_DIR, "stroke_ensemble_model.joblib")

# Load data
df = pd.read_csv(csv_path)
if "id" in df.columns:
    df = df.drop(columns=["id"])

numeric_features = ["age", "hypertension", "heart_disease", "avg_glucose_level", "bmi"]
categorical_features = ["gender", "ever_married", "work_type", "Residence_type", "smoking_status"]

X = df[numeric_features + categorical_features]
y = df["stroke"]

# Split for evaluation
X_train, X_test, y_train, y_test = train_test_split(X, y, stratify=y, test_size=0.2, random_state=42)

# Preprocessing
numeric_transformer = Pipeline(steps=[
    ("imputer", SimpleImputer(strategy="mean")),
    ("scaler", StandardScaler())
])
categorical_transformer = Pipeline(steps=[
    ("imputer", SimpleImputer(strategy="constant", fill_value="Unknown")),
    ("onehot", OneHotEncoder(handle_unknown="ignore"))
])

preprocessor = ColumnTransformer(
    transformers=[
        ("num", numeric_transformer, numeric_features),
        ("cat", categorical_transformer, categorical_features),
    ]
)

# Balance classes (SMOTE only on train)
X_train_processed = preprocessor.fit_transform(X_train)
sm = SMOTE(random_state=42)
X_train_bal, y_train_bal = sm.fit_resample(X_train_processed, y_train)

# Prepare test set
X_test_processed = preprocessor.transform(X_test)

# ---- Train multiple models ---- #
# KNN
knn = KNeighborsClassifier(n_neighbors=5)
knn.fit(X_train_bal, y_train_bal)

# Random Forest
rf = RandomForestClassifier(n_estimators=200, class_weight="balanced", random_state=42)
rf.fit(X_train_bal, y_train_bal)

# Logistic Regression
lr = LogisticRegression(max_iter=500, class_weight="balanced", solver="liblinear")
lr.fit(X_train_bal, y_train_bal)

# Evaluate
for name, model in [("KNN", knn), ("Random Forest", rf), ("Logistic Regression", lr)]:
    preds = model.predict(X_test_processed)
    probas = model.predict_proba(X_test_processed)[:, 1]
    print(f"\n{name} classification report:")
    print(classification_report(y_test, preds, digits=3))
    print(f"{name} ROC AUC:", roc_auc_score(y_test, probas))

# Save everything
joblib.dump({
    "preprocessor": preprocessor,
    "knn": knn,
    "rf": rf,
    "lr": lr,
    "numeric_features": numeric_features,
    "categorical_features": categorical_features
}, model_path)

print(f"All models and preprocessor saved at {model_path}")


