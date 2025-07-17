# import joblib
# import numpy as np
# from fastapi import FastAPI, HTTPException
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel
# from typing import Optional
# import traceback
# import pandas as pd

# # 1. Load the trained model **and columns**
# model_bundle = joblib.load("stroke_knn_model.joblib")
# model = model_bundle["model"]
# MODEL_COLUMNS = model_bundle["columns"]

# # 2. All possible categorical values (these should match training set)
# GENDER_CATS = ["Female", "Male", "Other"]
# MARRIED_CATS = ["No", "Yes"]
# WORK_TYPE_CATS = ["Govt_job", "Never_worked", "Private", "Self-employed", "children"]
# RESIDENCE_CATS = ["Rural", "Urban", "Suburban"]
# SMOKING_CATS = ["Unknown", "formerly smoked", "never smoked", "smokes"]

# app = FastAPI()

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# class PredictRequest(BaseModel):
#     gender: str
#     age: float
#     hypertension: int
#     heart_disease: int
#     ever_married: str
#     work_type: str
#     Residence_type: str
#     avg_glucose_level: Optional[float] = None
#     bmi: float
#     smoking_status: str

# @app.post("/api/predict")
# def predict(req: PredictRequest):
#     print("Received data:", req.dict())   # Debug print

#     try:
#         # 1. Prepare base features
#         features = {
#             "age": req.age,
#             "hypertension": req.hypertension,
#             "heart_disease": req.heart_disease,
#             "avg_glucose_level": req.avg_glucose_level if req.avg_glucose_level is not None else 0.0,
#             "bmi": req.bmi,
#         }

#         # 2. One-hot encode all categorical features
#         for cat in GENDER_CATS:
#             features[f"gender_{cat}"] = int(req.gender == cat)
#         for cat in MARRIED_CATS:
#             features[f"ever_married_{cat}"] = int(req.ever_married == cat)
#         for cat in WORK_TYPE_CATS:
#             features[f"work_type_{cat}"] = int(req.work_type == cat)
#         for cat in RESIDENCE_CATS:
#             features[f"Residence_type_{cat}"] = int(req.Residence_type == cat)
#         for cat in SMOKING_CATS:
#             features[f"smoking_status_{cat}"] = int(req.smoking_status == cat)

#         # 3. Fill missing columns with 0 (for safety), and ensure order matches model training
#         for col in MODEL_COLUMNS:
#             if col not in features:
#                 features[col] = 0

#         x_input_df = pd.DataFrame([features], columns=MODEL_COLUMNS)
#         pred = model.predict(x_input_df)[0]
#         prob = float(model.predict_proba(x_input_df)[0][1])


#         return {
#             "prediction": int(pred),
#             "probability": prob
#         }
#     except Exception as e:
#         # Print the full error stack for debugging
#         traceback.print_exc()
#         raise HTTPException(status_code=400, detail=f"Prediction failed: {str(e)}")

# @app.get("/")
# def health():
#     return {"status": "ok"}

# main.py
import os
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from typing import Optional
import numpy as np
import traceback

# Load all models and preprocessor
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_BUNDLE = joblib.load(os.path.join(BASE_DIR, "stroke_ensemble_model.joblib"))
preprocessor = MODEL_BUNDLE["preprocessor"]
knn = MODEL_BUNDLE["knn"]
rf = MODEL_BUNDLE["rf"]
lr = MODEL_BUNDLE["lr"]
NUMERIC_FEATURES = MODEL_BUNDLE["numeric_features"]
CATEGORICAL_FEATURES = MODEL_BUNDLE["categorical_features"]

GENDER_CATS = ["Female", "Male", "Other"]
MARRIED_CATS = ["No", "Yes"]
WORK_TYPE_CATS = ["Govt_job", "Never_worked", "Private", "Self-employed", "children"]
RESIDENCE_CATS = ["Rural", "Urban"]
SMOKING_CATS = ["Unknown", "formerly smoked", "never smoked", "smokes"]

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictRequest(BaseModel):
    gender: str
    age: float
    hypertension: int
    heart_disease: int
    ever_married: str
    work_type: str
    Residence_type: str
    avg_glucose_level: Optional[float]
    bmi: Optional[float]
    smoking_status: str

    @validator('gender')
    def gender_valid(cls, v):
        if v not in GENDER_CATS:
            raise ValueError(f"gender must be one of {GENDER_CATS}")
        return v

    @validator('ever_married')
    def married_valid(cls, v):
        if v not in MARRIED_CATS:
            raise ValueError(f"ever_married must be one of {MARRIED_CATS}")
        return v

    @validator('work_type')
    def work_type_valid(cls, v):
        if v not in WORK_TYPE_CATS:
            raise ValueError(f"work_type must be one of {WORK_TYPE_CATS}")
        return v

    @validator('Residence_type')
    def residence_valid(cls, v):
        if v not in RESIDENCE_CATS:
            raise ValueError(f"Residence_type must be one of {RESIDENCE_CATS}")
        return v

    @validator('smoking_status')
    def smoking_valid(cls, v):
        if v not in SMOKING_CATS:
            raise ValueError(f"smoking_status must be one of {SMOKING_CATS}")
        return v

    @validator('hypertension', 'heart_disease')
    def int_bool_valid(cls, v):
        if v not in [0, 1]:
            raise ValueError("hypertension and heart_disease must be 0 or 1")
        return v

    @validator('age')
    def age_valid(cls, v):
        if v < 0 or v > 120:
            raise ValueError("age must be between 0 and 120")
        return v

@app.post("/api/predict")
def predict(req: PredictRequest):
    try:
        # Prepare DataFrame in the right order
        input_data = {feat: [getattr(req, feat, None)] for feat in NUMERIC_FEATURES + CATEGORICAL_FEATURES}
        x_input_df = pd.DataFrame(input_data)

        # Preprocess
        X_proc = preprocessor.transform(x_input_df)

        # Predict probabilities for each model
        prob_knn = knn.predict_proba(X_proc)[0][1]
        prob_rf = rf.predict_proba(X_proc)[0][1]
        prob_lr = lr.predict_proba(X_proc)[0][1]
        # Average (soft voting)
        avg_prob = np.mean([prob_knn, prob_rf, prob_lr])
        # Majority prediction (hard voting)
        pred_knn = knn.predict(X_proc)[0]
        pred_rf = rf.predict(X_proc)[0]
        pred_lr = lr.predict(X_proc)[0]
        votes = [pred_knn, pred_rf, pred_lr]
        hard_pred = int(np.round(np.mean(votes)))

        percent = round(avg_prob * 100, 2)

        return {
            "prediction": hard_pred,
            "probability": percent,
            "probability_str": f"{percent}%",
            "model_votes": {"knn": int(pred_knn), "rf": int(pred_rf), "lr": int(pred_lr)},
            "model_probs": {
                "knn": round(prob_knn*100, 2),
                "rf": round(prob_rf*100, 2),
                "lr": round(prob_lr*100, 2),
            }
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Prediction failed: {str(e)}")

@app.get("/")
def health():
    return {"status": "ok"}





