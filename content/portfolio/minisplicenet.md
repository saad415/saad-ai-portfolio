---
id: minisplicenet
title: MiniSpliceNet
url: /projects/minisplicenet
---

MiniSpliceNet is a PyTorch-based deep learning workflow for splice-site classification from DNA sequence windows.

The project classifies fixed-length genomic sequence windows into donor splice site, acceptor splice site, or non-splice background sequence classes.

It uses motif-centred sequence-window construction, one-hot nucleotide encoding, a 1D CNN sequence classifier, stratified train and validation splits, cross-entropy optimization, and benchmark reporting with precision, recall, F1-score, and confusion-matrix analysis.

MiniSpliceNet is framed as a genome-annotation workflow for biological sequence modelling. It demonstrates data construction, nucleotide tensor encoding, neural model implementation, reproducible training, and class-aware evaluation.

The project connects splice-signal classification with genome annotation tasks, including FASTA/GTF-derived sequence modelling, transcriptomic evidence integration, and sequence-to-sequence approaches for alternative splice-form inference.
