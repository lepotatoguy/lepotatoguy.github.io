These notes explain the Transformer from *Attention Is All You Need* for an undergraduate reader. A vector is a list of numbers; a matrix is a table of numbers. You do not need to know recurrent networks or attention beforehand. The equations use the same operations described in the text beside them.

## Problem

A word's meaning often depends on other words in its sentence. Consider this illustrative sentence:

> The animal did not cross the road because it was tired.

To interpret "it," we need to connect it with "animal." A translation model needs to learn such relationships, including when the related words are far apart.

A recurrent neural network processes a sentence in order. At each position, it updates a hidden state, a vector that carries information from preceding positions. The next update depends on the previous update being finished.

This creates two difficulties. First, the updates within a sentence cannot all run at once during training. Second, information between distant words must travel through many intermediate updates. The longer that path, the harder it can be to learn the relationship.

The paper asks whether a model can connect positions directly, without this recurrent chain.

## Idea

The Transformer lets each token gather information directly from relevant tokens. A **token** is a unit of text, such as a word or part of a word. **Attention** computes how much information to take from each available position and combines that information.

The original Transformer is a translation model with two parts:

- The **encoder** reads the input sentence. It produces a vector for each token that includes information from the surrounding sentence.
- The **decoder** uses the encoder's vectors and the output generated so far to predict the next output token.

For example, when translating English into German, the encoder processes the English sentence. The decoder generates the German translation one token at a time.

Attention appears in three places: between tokens in the input, between tokens in the output, and between the output and the input. Feed-forward networks then process the information gathered at each position. These are small neural networks whose computations are explained below.

The title refers to replacing recurrence and convolution as ways of connecting sequence positions. The architecture also contains embeddings, feed-forward networks, normalization, and an output layer.

## Method

### 1. Turn text into vectors

The model first splits text into tokens. Splitting some words into smaller pieces lets a vocabulary represent words without needing a separate entry for every possible word.

Each token is mapped to an **embedding**, a vector of learned numbers. "Learned" means that training adjusts these numbers to improve the model's predictions. The vector gives the model a numerical representation it can process using matrix operations.

Token identity alone does not specify word order. The sentences "the dog chased the cat" and "the cat chased the dog" contain the same words but describe different events.

The model therefore adds a **positional encoding** to each embedding:

$$
\mathbf{x} = \mathbf{e} + \mathbf{p}
$$

Here, $\mathbf{e}$ is the token embedding, $\mathbf{p}$ is its positional encoding, and $\mathbf{x}$ is the resulting input vector at that position.

The original design uses sine and cosine signals at different frequencies. Each position receives a pattern of numbers describing where it occurs. These signals supply position information without learning a separate position vector for every position. They tell the model about order; training teaches it how to use that information.

### 2. Decide what each token should attend to

For each token representation, the attention mechanism computes three vectors:

| Vector | Role | Plain-language interpretation |
| :----- | :--- | :---------------------------- |
| Query | Compared with the available keys | What information would help update this token? |
| Key | Compared with a query to obtain a match score | What can this position be matched on? |
| Value | Contributes information to the resulting vector | What information can this position supply? |

These interpretations are an analogy. Queries, keys, and values are numerical vectors produced by learned transformations. They do not contain written questions or labels.

For a given query, the model compares it with each available key. It converts the resulting scores into weights, then uses those weights to mix the value vectors. A position with a larger weight contributes more to the mixture. Attention usually combines information from several positions rather than selecting just one.

#### Produce queries, keys, and values

In **self-attention**, queries, keys, and values all come from the same sequence of token representations. The word "self" refers to that shared source.

Put the token vectors into a matrix named $\mathbf{X}$, with one row per position. Then compute:

$$
\mathbf{Q} = \mathbf{X}\mathbf{W}^{Q}, \qquad
\mathbf{K} = \mathbf{X}\mathbf{W}^{K}, \qquad
\mathbf{V} = \mathbf{X}\mathbf{W}^{V}
$$

$\mathbf{W}^{Q}$, $\mathbf{W}^{K}$, and $\mathbf{W}^{V}$ are separate learned weight matrices. The superscripts label their query, key, and value roles; they are not powers. Multiplying $\mathbf{X}$ by them gives three different views of the same sequence. Each row of $\mathbf{Q}$ is a query; each row of $\mathbf{K}$ is a key; each row of $\mathbf{V}$ is a value.

A weight matrix contains model parameters adjusted during training. The attention weights computed from queries and keys are different: they are calculated for the current input and can change from sentence to sentence.

#### Compare queries with keys

The match score is a **dot product**: multiply corresponding components of a query and a key, then add those products. The learned transformations allow these scores to identify useful connections.

For all queries and keys at once, this calculation is written $\mathbf{Q}\mathbf{K}^{\mathsf{T}}$. The symbol $\mathsf{T}$ means transpose, which swaps a matrix's rows and columns. If the sequence has $n$ tokens, the resulting score matrix has $n$ rows and $n$ columns. Each row contains one query's scores against every key.

#### Turn scores into weights and gather information

The complete attention equation is:

$$
\operatorname{Attention}(\mathbf{Q}, \mathbf{K}, \mathbf{V})
= \operatorname{softmax}\left(
\frac{\mathbf{Q}\mathbf{K}^{\mathsf{T}}}{\sqrt{d_k}}
\right)\mathbf{V}
$$

Read it from the inside outward:

1. $\mathbf{Q}\mathbf{K}^{\mathsf{T}}$ computes the query-key match scores.
2. $d_k$ is the number of components in each query or key. Divide the scores by $\sqrt{d_k}$, the square root of that width, to control their scale. Without this scaling, wider vectors can produce large scores that make softmax difficult to train through.
3. $\operatorname{softmax}$ converts each row of scores into nonnegative weights that sum to one. Larger scores receive larger weights.
4. Multiplication by $\mathbf{V}$ computes a weighted sum of the value vectors for each query.

The result is an updated vector for each token. In the pronoun example, the representation at "it" can gather information from the position containing "animal." This illustrates a relationship the mechanism can learn; it is not a measurement of a particular trained attention head.

### 3. Look for several relationships at once

A single attention operation gives each token one weighted mixture of information. A token may need several kinds of context, so **multi-head attention** performs several attention operations in parallel.

Each **head** has its own learned query, key, and value projections. The heads can therefore compute different match scores and gather different mixtures from the same sequence.

Their output vectors are concatenated, meaning placed next to one another, and passed through another learned projection. This final projection combines the heads' information into the vector passed to the next part of the model.

No head is assigned a linguistic job in advance. A head might learn a useful grammatical relationship, but training determines its behavior.

The base model has eight heads. Each head uses queries, keys, and values of width 64. Joining the eight outputs gives a vector of width 512, matching the model's main representation width.

### 4. Stack encoder and decoder layers

One layer gathers and processes context. Stacking layers lets later layers work with representations already updated by earlier layers. The layers have the same structure, but each has its own learned parameters.

#### Inside an encoder layer

Each encoder layer has two main operations:

1. **Self-attention** lets each input position gather information from all input positions.
2. A **feed-forward network** further transforms the vector at each position.

The feed-forward network first expands the vector to a larger width, applies a function called **ReLU**, then projects it back to the original width. ReLU keeps positive values and sets negative values to zero. This nonlinear step lets the network learn transformations beyond a single matrix multiplication.

Each position is processed independently by this network, using the same weights across positions. Attention exchanges information between positions; the feed-forward network processes each resulting vector.

#### Inside a decoder layer

Each decoder layer has three main operations:

1. **Masked self-attention** gathers information from the available output prefix, the part of the output preceding the token being predicted.
2. **Encoder-decoder attention** gathers relevant information from the input sentence.
3. A **feed-forward network** transforms each position independently, as in the encoder.

The mask is needed because the decoder must predict a token without seeing future output tokens. Before softmax, scores for forbidden future positions are set to negative infinity. Softmax then gives those positions zero weight. This is a **causal mask**, because predictions can depend only on the available output history.

In encoder-decoder attention, the queries come from the decoder. The keys and values come from the encoder's output. Thus a decoder position can retrieve information from the input sentence while deciding what to generate next.

#### Keep the input and normalize the update

Each attention or feed-forward operation is a **sublayer**, a smaller part of a full layer. Around each sublayer, the original Transformer uses this pattern:

$$
\mathbf{y} = \operatorname{LayerNorm}\left(
\mathbf{x} + \operatorname{Sublayer}(\mathbf{x})
\right)
$$

$\mathbf{y}$ is the output, $\mathbf{x}$ is the sublayer's input, and $\operatorname{Sublayer}(\mathbf{x})$ is its computed update. Adding them is a **residual connection**. It carries the existing representation forward alongside the update, so each sublayer does not have to rebuild the representation from scratch.

$\operatorname{LayerNorm}$ means **layer normalization**. At each token position, it normalizes the components of that position's vector, then applies a learned scale and offset. In the original architecture, normalization happens after the input and update have been added.

#### Predict an output token

After the last decoder layer, a linear layer maps each decoder vector to a score for every token in the output vocabulary. Softmax converts these scores into probabilities for the next token.

There are two uses of softmax here. Inside attention, it produces weights over positions. At the output, it produces probabilities over vocabulary tokens.

## Training and generation

### Training: predict from the correct output prefix

During training, both the input sentence and its correct translation are available. The decoder receives the correct output shifted one position to the right:

```text
Decoder input:   <start>  I   am   here
Expected output: I        am  here <end>
```

This is an illustrative token sequence. `<start>` marks the beginning, and `<end>` marks the end.

At the first position, the model uses `<start>` to predict `I`. At the next, it uses the available prefix to predict `am`, and so on. Training compares each prediction with its expected token and adjusts the learned parameters to reduce prediction error.

Although the entire correct output is supplied in the training batch, the causal mask prevents each position from reading ahead at the answer. Shifting the output and applying the mask work together: each prediction can use only the output tokens that would already be available at generation time.

There is no recurrent chain between these training positions. Their masked attention computations and predictions can therefore be calculated in parallel, within each layer. The layers themselves still run in order.

### Generation: build the output prefix one token at a time

When generating a translation, the correct output is unknown. The decoder starts with a beginning token and predicts a next token. It adds that token to the prefix, predicts another, and repeats until it reaches an end token or a length limit.

Generation remains sequential because the next prediction depends on output that has just been generated. Parallel training does not mean that this decoder generates an entire translation in one step.

## Setup

The paper evaluates translation on the WMT 2014 English-to-German and English-to-French datasets. Text is split into subword tokens, so a word can occupy several token positions.

Translation is evaluated using **BLEU**, a score based on overlap between a generated translation and reference translations. A higher BLEU score indicates better agreement under this measure. It is an automatic evaluation measure, rather than a complete judgment of whether a translation is correct and natural.

### Model sizes

The paper compares a base configuration with a larger configuration called big:

| Configuration | Encoder / decoder layers | Vector width | Attention heads | Feed-forward inner width |
| :------------ | :----------------------- | :----------- | :-------------- | :----------------------- |
| Base | 6 / 6 | 512 | 8 | 2048 |
| Big | 6 / 6 | 1024 | 16 | 4096 |

"6 / 6" means six encoder layers and six decoder layers. "Vector width" is the number of components in the main token representation. "Feed-forward inner width" is the size of the expanded vector inside each feed-forward network.

### Optimization

The model is trained with **Adam**, an optimization algorithm that uses information from past gradients to adjust parameter updates. A gradient describes how changing a parameter would change the training loss, the numerical measure of prediction error.

The **learning rate** controls the scale of those updates. It first rises during a warmup period, then falls in proportion to the inverse square root of the training step. Thus the learning rate changes over training rather than staying fixed.

### Regularization

**Regularization** aims to reduce overfitting, where a model fits its training examples better than it generalizes to new examples.

The paper uses **dropout**, which randomly removes some activations during training. An activation is a numerical value produced inside the network. Dropout discourages the model from depending too heavily on particular activations.

It also uses **label smoothing**. Instead of making the target distribution put all its probability on the correct token, this assigns some probability to other tokens. This discourages overconfident predictions.

### Translation decoding

At generation time, **beam search** keeps several candidate output prefixes. It extends and scores these candidates, retaining promising possibilities rather than immediately committing to a single next token at every step.

The paper also averages model parameters across checkpoints near the end of training. A checkpoint is a saved set of parameter values. Averaging combines these saved values into the parameters used for evaluation.

## Reported results

These are findings reported by the paper. No replication was performed for these notes.

For **English-to-German**, both Transformer configurations outperform the compared GNMT and ConvS2S systems. GNMT is a recurrent translation model; ConvS2S uses convolution. The big Transformer also exceeds the compared ensembles of those systems. An ensemble combines predictions from multiple models.

For **English-to-French**, the big Transformer outperforms the compared single-model GNMT and ConvS2S systems. It also outperforms a mixture-of-experts translation model, which combines specialist networks.

The paper reports improved translation quality with a lower estimated training cost than several competitive alternatives. The caveat below explains how those cost estimates were obtained.

The architecture is also tested on **English constituency parsing**, which predicts how words group into phrases. For example, a parser can identify which words form a noun phrase. The Transformer is competitive on this task, although it does not lead every parser in the comparison.

## Ablations

An **ablation** changes part of a model or its training setup to investigate whether that choice matters. These experiments help test which design choices contribute to performance.

- **Multiple heads help in the tested configurations.** Using several heads improves over using one. Increasing the number further does not consistently improve results, so more heads are not automatically better.
- **Smaller query/key vectors hurt translation quality.** These vectors determine the information available for computing attention match scores. Reducing their width worsens results in the tested settings.
- **Dropout reduces overfitting.** The experiments support its use for improving generalization beyond the training examples.
- **Learned and fixed positional encodings perform similarly.** Learning position vectors gives results similar to the fixed sine/cosine signals in these experiments. The fixed signals therefore provide a workable way to supply order information.

These findings concern the configurations and tasks tested in the paper. They do not establish a universal best number of heads, vector width, or positional encoding.

## Caveats

### Direct connections become expensive for long sequences

**Dense attention** compares every query position with every key position. For a sequence of $n$ tokens, that produces an $n$ by $n$ table of scores. Computing each dot product also depends on the vector width, $d$.

The attention computation therefore costs $\mathcal{O}(n^{2}d)$. This notation describes how the amount of computation grows with sequence length and vector width; it is not a measured runtime. At a fixed width, doubling the sequence length makes the number of position pairs four times as large.

Parallel computation helps execute the comparisons, but it does not remove their cost. Long sequences can still be expensive.

### Attention is only part of the computation

The feed-forward layers also require computation. The cost of the complete Transformer includes these layers and the other operations around attention.

### Training-cost comparisons use estimates

The paper estimates training costs using hardware throughput and training time. The compared systems were not all measured in one shared experimental setup. These comparisons should therefore be read as estimates of computational cost, rather than controlled timing measurements under identical conditions.
