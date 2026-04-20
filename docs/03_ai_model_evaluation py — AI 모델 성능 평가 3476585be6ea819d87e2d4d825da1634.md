# 03_ai_model_evaluation.py — AI 모델 성능 평가

> **문서번호:** AX-AI-EVAL-2026-001
> 

> **목적:** Mask R-CNN/Y-MaskNet, KoBERT, OpenCV 균열분석 모델의 Precision/Recall/F1/혼동행렬 평가
> 

> **로컬 경로:** `F:\ATOM_Project\atom_followup_202604W4\scripts\03_ai_model_evaluation.py`
> 

> **NAS 데이터:** `\\\\192.168.0.29\\nas_docs` (2,792,855개) + `\\\\192.168.0.29\\nas_photos` (114,286개)
> 

---

## 실행 방법

```bash
# 의존성 설치
pip install numpy pandas scikit-learn matplotlib seaborn openpyxl pillow tabulate

# 실행 (NAS 연동)
python 03_ai_model_evaluation.py --nas-docs //192.168.0.29/nas_docs \
                                 --nas-photos //192.168.0.29/nas_photos \
                                 --output ./results

# NAS 없이 시뮬레이션 모드
python 03_ai_model_evaluation.py --output ./results
```

## 출력 파일

| 파일 | 설명 |
| --- | --- |
| `AI_모델_성능평가_종합.xlsx` | 3개 모델 성능 종합 (5개 시트) |
| `defect_detection_confusion_matrix.png` | 결함 탐지 혼동행렬 (8클래스) |
| `defect_detection_class_performance.png` | 클래스별 P/R/F1 바 차트 |
| `kobert_complaint_confusion_matrix.png` | 민원 분류 혼동행렬 (7카테고리) |
| `crack_width_measurement.png` | 균열폭 실측 vs 예측 산점도 |
| `crack_grade_confusion_matrix.png` | 균열 등급 판정 혼동행렬 (A~E) |
| `ai_model_evaluation_results.json` | 전체 결과 JSON |

---

# 기술 보고서 (Technical Report)

## 1. 혼동행렬 (Confusion Matrix) — AI 평가의 핵심

건물 안전 진단으로 비유하면:

```
              AI가 "결함"이라고 함    AI가 "정상"이라고 함
진짜 결함   │  TP (맞춤!)       │  FN (놓쳤 ☠️)     │
진짜 정상   │  FP (헛알람)     │  TN (맞춤!)       │

 TP = True Positive  — 진짜 결함을 결함이라고 맞춤
 FP = False Positive — 정상인데 결함이라고 헛알람 (불필요한 보수 발생)
 FN = False Negative — 결함인데 놓쳤 (위험! 사고 발생 가능)
 TN = True Negative  — 정상을 정상이라고 맞춤
```

## 2. Precision, Recall, F1-Score

```
Precision (정밀도) = TP / (TP + FP)
→ "AI가 결함이라고 한 것 중 진짜 결함 비율"
→ 높으면: 헛알람이 적다 (불필요한 보수공사 감소)

Recall (재현율) = TP / (TP + FN)
→ "실제 결함 중 AI가 찾아낸 비율"
→ 높으면: 놓치는 결함이 적다 (안전 사고 방지)

F1-Score = 2 × (P × R) / (P + R)  ← 조화평균!
```

**왜 조화평균인가?** 산술평균은 한쪽이 높으면 감춰지지만, 조화평균은 둘 다 높아야 높아집니다.

```
예시: P=0.99, R=0.01 (거의 다 놓침)
  산술평균 = (0.99+0.01)/2 = 0.50 (높아 보임)
  조화평균 = 2×0.99×0.01/(0.99+0.01) = 0.02 (실태 반영!)
```

## 3. Macro vs Weighted F1

```
Macro F1 = (1/C) × Σ F1ᵢ
→ 모든 클래스를 동등하게 취급 (소수 클래스도 동일 비중)

Weighted F1 = Σ(wᵢ × F1ᵢ),  wᵢ = nᵢ/N
→ 데이터 수에 비례하여 가중치 (불균형 데이터에 적합)
```

## 4. 회귀 지표: MAE, MSE, RMSE

균열폭 측정처럼 "얼마나 정확한가"를 측정할 때 사용:

```
MAE  = (1/n) × Σ|yᵢ - ŷᵢ|
→ "평균적으로 몇 mm 틀리나"
→ MAE = 0.08mm → "평균 0.08mm 오차"

RMSE = √[(1/n) × Σ(yᵢ - ŷᵢ)²]
→ 큰 오차에 벌칙 (넓이 1mm 오차는 심각하게 반영)

비교: MAE는 매꾸러운 평균, RMSE는 난폭한 오차에 민감
```

## 5. Mask R-CNN 아키텍처

```
입력 이미지 → ResNet Backbone → FPN (피처 피라미드)
            → RPN (Region Proposal Network)
            → ROI Align (관심 영역 정렬)
            → 3가지 출력:
               1) 분류 (균열/누수/박리/...)
               2) 바운딩박스 (위치)
               3) 마스크 (정확한 윤곽)

IoU = |교집합| / |합집합|
→ AI가 그린 상자와 정답 상자가 얼마나 겹치나
→ IoU ≥ 0.5이면 "맞춤"으로 판정
```

Ref: He et al. (2017) "Mask R-CNN" — ICCV 2017

## 6. KoBERT 아키텍처

```
Transformer Self-Attention:

  Attention(Q,K,V) = softmax(Q·Kᵀ / √d_k) · V

  Q = Query ("나는 누구와 관련 있나?")
  K = Key   ("나는 이런 특징이 있어")
  V = Value ("나의 실제 정보는 이것")

민원 텍스트 → KoBERT 토크나이저 (SentencePiece)
             → Transformer 12층 (Self-Attention)
             → 7개 카테고리 분류 헤드
             → softmax → 확률 출력
```

Ref: Devlin et al. (2019) "BERT" — NAACL, SKTBrain KoBERT

## 7. OpenCV 균열 측정 원리

```
1) Grayscale 변환 → 흑백 이미지로
2) Gaussian Blur → 노이즈 제거
3) Canny Edge Detection → 균열 윤곽선 추출
4) Contour Analysis → 균열 영역 식별
5) Calibration → 픽셀을 mm로 변환

캘리브레이션: 실제_길이(mm) = 픽셀_수 / (pixels_per_mm)
→ 기준자(측정 바) 사진으로 pixels_per_mm 계산
```

## 8. Human-in-the-Loop (HITL)

AI가 100% 완벽하지 않으므로, 사람이 최종 검토하는 방식:

```
AI 탐지 → 신뢰도 확인 → 엔지니어 검토 → 승인/기각

신뢰도 > 90%: 자동 승인 (검토 부담 감소)
신뢰도 50~90%: 엔지니어 검토 필수
신뢰도 < 50%: 자동 기각
```

## 9. 균열 등급 판정 기준 (시설물안전법, KCS 14 20 10)

RC 부재 균열폭 기준으로 A~E 등급을 판정합니다. **0.3mm이 "보수 필요" 경계선**이고, **1.0mm 이상은 "긴급 조치"** 입니다.

OpenCV의 ±0.2mm 정밀도는: B등급(0.1~0.3mm)과 C등급(0.3~0.5mm)의 경계를 정확히 구분할 수 있다는 의미입니다.

## 10. 참고문헌 (References)

### 10.1 객체 탐지 · 분할 (Object Detection & Segmentation)

1. **He, K., Gkioxari, G., Dollár, P., Girshick, R. (2017)** — "Mask R-CNN". *IEEE ICCV*, 2961–2969. DOI: 10.1109/ICCV.2017.322.
2. **Ren, S., He, K., Girshick, R., Sun, J. (2015)** — "Faster R-CNN: Towards Real-Time Object Detection with Region Proposal Networks". *NeurIPS*, 91–99.
3. **Girshick, R. (2015)** — "Fast R-CNN". *IEEE ICCV*, 1440–1448.
4. **Girshick, R., Donahue, J., Darrell, T., Malik, J. (2014)** — "Rich Feature Hierarchies for Accurate Object Detection and Semantic Segmentation" (R-CNN). *IEEE CVPR*.
5. **He, K., Zhang, X., Ren, S., Sun, J. (2016)** — "Deep Residual Learning for Image Recognition" (ResNet). *IEEE CVPR*, 770–778.
6. **Lin, T.-Y., Dollár, P., Girshick, R., He, K., Hariharan, B., Belongie, S. (2017)** — "Feature Pyramid Networks for Object Detection" (FPN). *IEEE CVPR*, 2117–2125.
7. **Long, J., Shelhamer, E., Darrell, T. (2015)** — "Fully Convolutional Networks for Semantic Segmentation" (FCN). *IEEE CVPR*.
8. **Redmon, J., Divvala, S., Girshick, R., Farhadi, A. (2016)** — "You Only Look Once: Unified, Real-Time Object Detection" (YOLO). *IEEE CVPR*.
9. **Lin, T.-Y., Goyal, P., Girshick, R., He, K., Dollár, P. (2017)** — "Focal Loss for Dense Object Detection" (RetinaNet). *IEEE ICCV*.
10. **Krizhevsky, A., Sutskever, I., Hinton, G.E. (2012)** — "ImageNet Classification with Deep Convolutional Neural Networks" (AlexNet). *NeurIPS*.

### 10.2 Transformer · NLP · KoBERT

1. **Vaswani, A. et al. (2017)** — "Attention Is All You Need". *NeurIPS*, 5998–6008.
2. **Devlin, J., Chang, M.-W., Lee, K., Toutanova, K. (2019)** — "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding". *NAACL-HLT*, 4171–4186.
3. **Liu, Y., Ott, M., Goyal, N. et al. (2019)** — "RoBERTa: A Robustly Optimized BERT Pretraining Approach". *arXiv:1907.11692*.
4. **Sanh, V., Debut, L., Chaumond, J., Wolf, T. (2019)** — "DistilBERT: A Distilled Version of BERT". *NeurIPS Workshop*.
5. **SKTBrain (2019)** — *KoBERT: Korean BERT pretrained on Korean Wikipedia and news corpus*. GitHub: SKTBrain/KoBERT.
6. **Park, J., Cho, K. (2020)** — "KorNLI and KorSTS: New Benchmarks for Korean Natural Language Understanding". *EMNLP Findings*.
7. **Park, S. et al. (2021)** — "KLUE: Korean Language Understanding Evaluation". *NeurIPS Datasets and Benchmarks*.
8. **Kudo, T., Richardson, J. (2018)** — "SentencePiece: A Simple and Language Independent Subword Tokenizer". *EMNLP*.

### 10.3 영상 처리 · 균열 순상 검사 (Image Processing & Crack Detection)

1. **Canny, J. (1986)** — "A Computational Approach to Edge Detection". *IEEE TPAMI*, **8**(6), 679–698.
2. **Suzuki, S., Abe, K. (1985)** — "Topological Structural Analysis of Digitized Binary Images by Border Following". *CVGIP*, **30**(1), 32–46 (OpenCV findContours 원본).
3. **OpenCV Team** — *OpenCV 4.x Documentation*: Canny edge, Contour analysis, Morphological operations.
4. **Cha, Y.-J., Choi, W., Büyüköztürk, O. (2017)** — "Deep Learning-Based Crack Damage Detection Using Convolutional Neural Networks". *Computer-Aided Civil and Infrastructure Engineering*, **32**(5), 361–378.
5. **Zhang, L., Yang, F., Zhang, Y.D., Zhu, Y.J. (2016)** — "Road Crack Detection Using Deep Convolutional Neural Network". *IEEE ICIP*, 3708–3712.
6. **Koch, C., Georgieva, K., Kasireddy, V., Akinci, B., Fieguth, P. (2015)** — "A Review on Computer Vision Based Defect Detection and Condition Assessment of Concrete and Asphalt Civil Infrastructure". *Advanced Engineering Informatics*, **29**(2), 196–210.
7. **Dorafshan, S., Thomas, R.J., Maguire, M. (2018)** — "Comparison of Deep Convolutional Neural Networks and Edge Detectors for Image-based Crack Detection in Concrete". *Construction and Building Materials*, **186**, 1031–1045.
8. **Mohan, A., Poobal, S. (2018)** — "Crack Detection Using Image Processing: A Critical Review and Analysis". *Alexandria Engineering Journal*, **57**(2), 787–798.
9. **Liu, Y., Yao, J., Lu, X., Xie, R., Li, L. (2019)** — "DeepCrack: A Deep Hierarchical Feature Learning Architecture for Crack Segmentation". *Neurocomputing*, **338**, 139–153.
10. **Gonzalez, R.C., Woods, R.E. (2018)** — *Digital Image Processing*, 4th ed. Pearson. ISBN 978-0-133-35672-4.

### 10.4 머신러닝 평가 · 통계 (ML Evaluation & Statistics)

1. **Powers, D.M.W. (2011)** — "Evaluation: From Precision, Recall and F-Measure to ROC, Informedness, Markedness & Correlation". *Journal of Machine Learning Technologies*, **2**(1), 37–63.
2. **Sokolova, M., Lapalme, G. (2009)** — "A Systematic Analysis of Performance Measures for Classification Tasks". *Information Processing & Management*, **45**(4), 427–437.
3. **Fawcett, T. (2006)** — "An Introduction to ROC Analysis". *Pattern Recognition Letters*, **27**(8), 861–874.
4. **Pedregosa, F. et al. (2011)** — "Scikit-learn: Machine Learning in Python". *Journal of Machine Learning Research*, **12**, 2825–2830.
5. **Goodfellow, I., Bengio, Y., Courville, A. (2016)** — *Deep Learning*. MIT Press. ISBN 978-0-262-03561-3.
6. **Bishop, C.M. (2006)** — *Pattern Recognition and Machine Learning*. Springer.

### 10.5 Human-in-the-Loop · 신뢰성 AI (HITL & Trustworthy AI)

1. **Amershi, S., Cakmak, M., Knox, W.B., Kulesza, T. (2014)** — "Power to the People: The Role of Humans in Interactive Machine Learning". *AI Magazine*, **35**(4), 105–120.
2. **Wu, X. et al. (2022)** — "A Survey of Human-in-the-Loop for Machine Learning". *Future Generation Computer Systems*, **135**, 364–381.
3. **Doshi-Velez, F., Kim, B. (2017)** — "Towards A Rigorous Science of Interpretable Machine Learning". *arXiv:1702.08608*.

### 10.6 국내 기준 · 지침 (Korean Standards & Codes)

1. **KCS 14 20 10** — *콘크리트 구조물 균열 기준* (국토교통부 국가건설기준).
2. **KCS 14 20 30** — *콘크리트 구조 보수·보강 기준*.
3. **KCS 14 20 40** — *방수 성능 기준*.
4. **시설물의 안전 및 유지관리에 관한 특별법** (2018, 이하 「시설물안전법」) — 안전등급 A～E 판정 기준.
5. **시설물의 안전점검 · 정밀안전진단 세부지침** (국토안전관리원, 2021) — 균열폭 평가방법.
6. **KDS 14 20 01** — *콘크리트구조 설계기준 (일반)*.

---

## 핵심 구조

### 1. 결함 탐지 모델 평가 (Mask R-CNN / Y-MaskNet)

**8클래스 분류:** crack(균열), leak(누수), spalling(박리), corrosion(부식), efflorescence(백태), deformation(변형), damage(파손), normal(정상)

```python
DEFECT_CLASSES = [
    "crack", "leak", "spalling", "corrosion",
    "efflorescence", "deformation", "damage", "normal",
]

# KCS 표준 참조 매핑 (기능명세서 F-AI-001)
KCS_STANDARD_MAP = {
    "crack":    "KCS 14 20 10 (콘크리트 균열)",
    "leak":     "KCS 14 20 40 (방수 성능)",
    "spalling": "KCS 14 20 10 (콘크리트 박리)",
    "corrosion":"KCS 14 20 30 (철근 부식)",
    # ...
}

class DefectDetectionEvaluator:
    def collect_nas_test_images(self):
        # NAS nas_photos/01. 2025년 진단1팀 프로젝트/ (15,841개)
        # 파일명/폴더명 키워드로 결함 유형 자동 라벨링
        # MOC 태그 매핑 규칙 적용

    def evaluate(self) -> dict:
        # Accuracy, Precision, Recall, F1 (전체 + 클래스별)
        # 혼동행렬 생성
        # 목표: ≥ 93.1%
```

**NAS 데이터 활용 — 키워드 기반 자동 라벨링:**

```python
def _infer_label_from_path(self, path):
    keywords = {
        "crack": ["균열", "크랙", "crack"],
        "leak": ["누수", "leak"],
        "spalling": ["박리", "박락", "spall"],
        "corrosion": ["부식", "철근노출", "녹"],
        "efflorescence": ["백태", "백화"],
        "deformation": ["처짐", "변형", "좌굴"],
        "damage": ["파손", "손상"],
    }
```

### 2. 민원 분류 모델 평가 (KoBERT)

**7카테고리:** 시설, 소음, 위생, 안전, 주차, 관리비, 기타

```python
class ComplaintClassificationEvaluator:
    def evaluate(self) -> dict:
        # Weighted F1-Score (불균형 데이터 보정)
        # Macro Precision / Recall
        # SLA 추천 정확도 (올바른 카테고리 = 올바른 SLA)
        # 목표: Weighted F1 ≥ 0.85

    # 실제 민원 텍스트 샘플 포함
    sample_texts = {
        "시설": ["지하주차장 천장에 누수가 발생하여..."],
        "소음": ["윗집에서 매일 밤 12시 넘어서 쿵쿵..."],
        "안전": ["놀이터 그네 체인이 끊어질 것 같습니다..."],
        # ...
    }
```

### 3. 균열 정밀 측정 평가 (OpenCV WASM)

**균열 등급 기준 — MOC 문서 9.1절 (시설물안전법 기반):**

| 등급 | 균열폭 (mm) | 상태 |
| --- | --- | --- |
| A | < 0.1 | 양호 — 경미한 미세균열 |
| B | 0.1 ~ 0.3 | 경미 — 표면 균열, 관찰 필요 |
| C | 0.3 ~ 0.5 | 보통 — 보수 필요 |
| D | 0.5 ~ 1.0 | 미흡 — 즉시 보수보강 필요 |
| E | > 1.0 | 불량 — 긴급 조치 및 사용제한 |

```python
class CrackAnalysisEvaluator:
    def evaluate(self) -> dict:
        # 1. 균열폭 MAE / RMSE
        # 2. ±0.2mm 이내 비율 (목표 정밀도)
        # 3. 균열 길이 MAE
        # 4. 등급 자동 판정 정확도 (A~E)
        # 5. 등급별 측정 정밀도 분해
        # 6. 평균 신뢰도

    def plot_width_scatter(self, results, output_dir):
        # 실측 vs 예측 산점도 (등급별 색상)
        # ±0.2mm 허용 범위 시각화
        # 오차 분포 히스토그램
```

### 4. 종합 판정

| 모델 | 작업 | 주요지표 | 목표 |
| --- | --- | --- | --- |
| Mask R-CNN / Y-MaskNet | 결함 탐지 (8-class) | Accuracy | ≥ 93.1% |
| KoBERT | 민원 분류 (7-class) | Weighted F1 | ≥ 0.85 |
| OpenCV WASM | 균열폭 측정 | MAE | ≤ ±0.2mm |
| OpenCV WASM | 균열 등급 판정 | Accuracy | ≥ 90% |