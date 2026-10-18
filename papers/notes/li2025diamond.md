## Why I read it

I presented this paper at the University of Delaware (Department of Computer and Information Sciences).

## Background

- Dementia covers diseases such as Alzheimer's disease (AD, 60 to 80% of cases) and frontotemporal dementia (FTD, the second most common under age 65).
- Diagnosis is hard because symptoms overlap.
- MRI shows shrinkage in memory-related brain regions; PET shows how active each brain area is. Using both helps diagnosis (Dukart et al., PLoS ONE 2011), but the combination is hard to model in deep learning.

## Motivation

- Existing MRI and PET fusion methods often underperform PET-only models.
- CNN pipelines dominate; vision transformers are underused.
- Little work on differential diagnosis (which dementia, e.g. AD vs. FTD); most work only detects AD.

## Method

Three parallel ViT branches on 3D scans:

1. **MRI branch**: self-attention over MRI patches.
2. **PET branch**: self-attention over PET patches.
3. **Joint branch**: bi-attention, where MRI and PET patches attend to each other. A constant threshold τ drops weak or noisy cross-modal links, so only strong similarities remain.

**RegBN** (multi-modal batch normalization with regularization) sits between the self-attention branches. Because bi-attention already models what the modalities share, RegBN removes that shared part from the single-modality features. It uses linear regression: project PET features Z_P into MRI space with a matrix ω and keep the residual Z_(M,r), the part of the MRI features Z_M not explained by PET.

Pipeline: inputs, self-attention on MRI and PET, RegBN for independence of F_P and F_M, bi-attention for cross-modal patterns, concatenate the three feature sets, MLP head predicts the class (CN, MCI, AD or FTD).

## Setup

- Data: ADNI and J-ADNI for CN vs. MCI vs. AD; an in-house set for CN vs. AD vs. FTD.
- Preprocessing: baseline scans only, standard normalization, registration to MNI152, rescaled to 128 × 128 × 128, gray-matter maps from MRI.
- Training: 3D patch-based ViT, 5-fold cross-validation, AdamW.
- Metrics: balanced accuracy (BACC), F1, precision, recall.

## Results

Numbers as summarized on my slides (approximate where marked ~).

| Task | Comparison | DiaMond BACC |
|---|---|---|
| CN vs. AD | PET-only ~89% | 92.4% (ADNI), 91.7% (J-ADNI) |
| CN vs. MCI vs. AD | best among CNN and fusion baselines | ~65.2% |
| CN vs. AD vs. FTD | PET-only ~69.5%, best ViT fusion ~74.1% | ~76.5% |

**Fairness**: performance is consistent across age groups; by gender, male 92.5% and female 91.7%; by diagnosis, TPR 94.5% for CN and 89.5% for AD.

## Ablations

- All three branches (F_M, F_P, F_(M,P)) together work best.
- RegBN adds about 2% BACC.
- τ = 0.01 gives the best results for the bi-attention threshold.
