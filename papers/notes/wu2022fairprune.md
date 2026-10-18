## Motivation

- Skin-disease classifiers show accuracy gaps across skin tone and gender.
- Existing debiasing suppresses sensitive features, which costs accuracy. In medical images those features overlap with real diagnostic detail, so accuracy drops for every group.
- Goal: reduce the accuracy gap between the privileged and unprivileged group while keeping overall accuracy as high as possible.

## Idea

Different parts of a network help different groups. Some parameters mainly boost the group that already has higher accuracy. Removing them shrinks the gap while overall accuracy stays stable. Pruning is usually used for efficiency; here it is used for fairness, and the efficient model is a byproduct.

## Method

1. Estimate each parameter's importance (saliency) as how much the loss would rise if it were removed, using a second-derivative approximation.
2. Compute this saliency separately for each demographic group.
3. Compare the two importance maps to find parameters that matter a lot for one group and little for the other.
4. Prune the parameters that are important for the privileged group but not for the unprivileged group.

Per-group saliency of weight θᵢ, where Hᵢᵢ is the second derivative of the loss with respect to θᵢ:

```
saliency_i(group) = 1/2 · H_ii(group) · θ_i²
```

Final pruning score, where β sets how strongly weights important to the privileged group are penalized:

```
score_i = 1/2 · θ_i² · ( H_ii(unprivileged) − β · H_ii(privileged) )
```

High saliency means removing the weight would hurt performance; low saliency means the model barely uses it.

## Setup

- Datasets: Fitzpatrick-17k (light vs dark skin tone), ISIC 2019 (female vs male).
- Backbone: VGG-11, trained with Adam on an Nvidia V100.
- Metrics: per-group accuracy, accuracy gap, equalized opportunity and equalized odds.
  - Eopp1 = Σₖ |TPRₖ¹ − TPRₖ⁰| over classes k. Intuition: when the disease is present, does the model catch it equally well for both groups?
  - Eopp0 = Σₖ |TNRₖ¹ − TNRₖ⁰|.

## Results

**Fitzpatrick-17k**

- Reduces Eopp0, Eopp1 and Eodd across all classes.
- The accuracy gap between groups drops somewhat; unprivileged-group accuracy stays stable and overall accuracy stays close to the original model.
- Beats adversarial debiasing (AdvConf, AdvRev): larger fairness gains with a smaller accuracy loss.

**ISIC 2019**

- The baseline shows a clear gap between male and female groups.
- Adversarial debiasing closes some of the fairness gap but lowers overall accuracy.
- After pruning, the gender accuracy gap becomes very small, Eopp1 and Eodd fall below both the baseline and adversarial debiasing, and overall accuracy stays close to the original.

## Ablations

- β trades fairness against accuracy: higher β lowers Eopp1 while accuracy falls only slowly.
- Accuracy is stable at low to mid pruning ratios. Fairness keeps improving as the ratio grows, but very large ratios hurt accuracy.
