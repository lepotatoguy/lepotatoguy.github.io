## Problem

A word often makes sense only when connected to other words in the sentence. For example, in "The animal did not cross the road because it was tired," understanding "it" requires connecting it to "animal."

Recurrent models pass information along a chain, processing each position after the previous one. This limits parallel training and gives distant words a long path through which to exchange information.

## Idea

Let each token look directly at the tokens that help explain it. This is attention: choosing how much information to take from each position.

The Transformer has two parts:

- The **encoder** reads the input sentence and builds a context-aware representation of each token.
- The **decoder** uses those representations and the output generated so far to predict the next token.

Attention connects words within the input, within the output, and between the two. Feed-forward networks then transform the information gathered at each position.

## Method

### 1. Turn text into vectors

Split text into tokens, which can be words or word fragments. Convert each token into a learned list of numbers called an embedding.

Add a positional encoding to each embedding so the model can distinguish token order. The original design uses sine and cosine signals at different frequencies. These provide position information without learning a separate vector for every position.

### 2. Decide what each token should attend to

Each token gets three learned vectors:

- **Query**: what information am I looking for?
- **Key**: what information can I be matched on?
- **Value**: what information will I contribute if selected?

The query is compared with every key. A stronger match gives that position more weight. The output is a weighted mixture of the values.

For self-attention, queries, keys and values all come from the same sequence of token representations, X:

```
Q = XW_Q
K = XW_K
V = XW_V

Attention(Q, K, V) = softmax(QKᵀ / sqrt(d_k)) V
```

W_Q, W_K and W_V are learned weight matrices. QKᵀ calculates the query-key matches. The query/key vector width is d_k; dividing by its square root controls the score scale as vectors get wider.

Softmax turns each query's scores into nonnegative weights that sum to one. Multiplying those weights by V gathers the information. This is how a pronoun's representation can draw on a noun several words away.

### 3. Look for several relationships at once

One attention operation produces one mixture of information. Multi-head attention runs several such operations in parallel, each with its own learned projections.

The heads can learn different relationships. Their outputs are joined and passed through another learned projection. No linguistic role is assigned to a head in advance.

The base model uses eight heads. Each head has query, key and value vectors of width 64, producing a combined representation of width 512.

### 4. Stack encoder and decoder layers

Each encoder layer has two steps:

1. **Self-attention** gathers context from all input positions.
2. A **feed-forward network** transforms each token independently, using the same weights across positions. It expands the vector, applies ReLU, then projects back to the original width. ReLU sets negative values to zero.

Each decoder layer has three steps:

1. **Masked self-attention** gathers information from the available output prefix. Future positions are blocked by setting their attention scores to negative infinity before softmax, giving them zero weight.
2. **Encoder-decoder attention** retrieves relevant input information. Queries come from the decoder; keys and values come from the encoder output.
3. A **feed-forward network** transforms each position independently.

Each attention or feed-forward sublayer keeps its input and adds its computed update. Layer normalization then normalizes the features within each token representation, with learned scale and offset:

```
output = LayerNorm(x + Sublayer(x))
```

This residual connection carries the input forward alongside the update. Normalization happens after the addition in this architecture.

At the end of the decoder, a linear layer produces a score for each vocabulary token. Softmax turns these scores into probabilities for the next token.

## Training and generation

During training, the correct output sentence is already available. The decoder receives it shifted right:

```
Decoder input:   <start>  I   am   here
Expected output: I        am  here <end>
```

Each position learns to predict the next token. The mask prevents it from looking ahead at the answer. Because there is no recurrent chain, these predictions can be computed in parallel.

During generation, future tokens are unknown. Start with a beginning token, predict the next token, add it to the prefix, and repeat until an end token or length limit. Generation therefore remains sequential.

## Setup

Translation tasks use WMT 2014 English-to-German and English-to-French data, split into subword tokens. BLEU measures overlap between generated translations and reference translations.

| Configuration | Encoder / decoder layers | Vector width | Attention heads | Feed-forward inner width |
| :------------ | :----------------------- | :----------- | :-------------- | :----------------------- |
| Base | 6 / 6 | 512 | 8 | 2048 |
| Big | 6 / 6 | 1024 | 16 | 4096 |

- **Optimization**: Adam, with a learning rate that rises during warmup, then falls with the inverse square root of the training step.
- **Regularization**: dropout randomly removes activations during training. Label smoothing softens target probabilities to discourage overconfidence.
- **Translation decoding**: beam search keeps several candidate output prefixes instead of committing immediately to one. Model parameters are averaged across checkpoints near the end of training.

## Reported results

- English-to-German: both configurations outperform GNMT, a recurrent translation model, and ConvS2S, a convolutional translation model. The big model also exceeds their compared ensembles.
- English-to-French: the big model outperforms the single-model GNMT and ConvS2S systems, along with a mixture-of-experts translation model that combines specialist networks.
- Translation quality improves with lower estimated training cost than several competitive alternatives.
- The same architecture also works for English constituency parsing, which predicts how words group into phrases. It is competitive without leading every compared parser.

No replication was performed for these notes.

## Ablations

- Multiple heads improve over a single head in the tested configurations. Adding more heads beyond that does not consistently help.
- Smaller query/key vectors hurt translation quality.
- Dropout reduces overfitting.
- Learned positional embeddings and fixed sine/cosine encodings perform similarly.

## Caveats

- Dense attention compares every pair of positions. Its attention computation costs O(n² · d), where n is sequence length and d is vector width. Long sequences become expensive even though the computation can be parallelized.
- Feed-forward layers add computation beyond attention itself.
- Training-cost comparisons are estimates based on hardware throughput and training time, rather than measurements from one shared experimental setup.
