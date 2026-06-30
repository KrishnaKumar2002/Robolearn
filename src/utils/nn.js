export class NeuralNetwork {
  constructor(inputNodes, hiddenNodes, outputNodes) {
    this.i_nodes = inputNodes;
    this.h_nodes = hiddenNodes;
    this.o_nodes = outputNodes;

    // Weights
    this.weights_ih = new Float32Array(this.i_nodes * this.h_nodes).map(() => Math.random() * 2 - 1);
    this.weights_ho = new Float32Array(this.h_nodes * this.o_nodes).map(() => Math.random() * 2 - 1);

    // Biases
    this.bias_h = new Float32Array(this.h_nodes).map(() => Math.random() * 2 - 1);
    this.bias_o = new Float32Array(this.o_nodes).map(() => Math.random() * 2 - 1);
    
    this.learning_rate = 0.05;
  }

  relu(x) { return Math.max(0, x); }
  drelu(x) { return x > 0 ? 1 : 0; }
  
  softmax(arr) {
    const max = Math.max(...arr);
    const exps = arr.map(x => Math.exp(x - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(x => x / sum);
  }

  predict(input_array) {
    // Hidden layer
    let hidden = new Float32Array(this.h_nodes);
    for(let i=0; i<this.h_nodes; i++) {
      let sum = this.bias_h[i];
      for(let j=0; j<this.i_nodes; j++) {
        sum += input_array[j] * this.weights_ih[j * this.h_nodes + i];
      }
      hidden[i] = this.relu(sum);
    }

    // Output layer
    let output = new Float32Array(this.o_nodes);
    for(let i=0; i<this.o_nodes; i++) {
      let sum = this.bias_o[i];
      for(let j=0; j<this.h_nodes; j++) {
        sum += hidden[j] * this.weights_ho[j * this.o_nodes + i];
      }
      output[i] = sum;
    }

    return this.softmax(output);
  }

  train(input_array, target_array) {
    // Forward pass
    let hidden_raw = new Float32Array(this.h_nodes);
    let hidden = new Float32Array(this.h_nodes);
    for(let i=0; i<this.h_nodes; i++) {
      let sum = this.bias_h[i];
      for(let j=0; j<this.i_nodes; j++) {
        sum += input_array[j] * this.weights_ih[j * this.h_nodes + i];
      }
      hidden_raw[i] = sum;
      hidden[i] = this.relu(sum);
    }

    let output = new Float32Array(this.o_nodes);
    for(let i=0; i<this.o_nodes; i++) {
      let sum = this.bias_o[i];
      for(let j=0; j<this.h_nodes; j++) {
        sum += hidden[j] * this.weights_ho[j * this.o_nodes + i];
      }
      output[i] = sum;
    }
    
    let probs = this.softmax(output);

    // Cross entropy loss derivative with softmax is simply (probs - targets)
    // Assuming target_array is one-hot encoded
    let output_errors = new Float32Array(this.o_nodes);
    for(let i=0; i<this.o_nodes; i++) {
      output_errors[i] = target_array[i] - probs[i]; 
      // note: using gradient ascent for targets (so target - prob), 
      // or standard weight update w = w + lr * error * input
    }

    // Calculate hidden errors
    let hidden_errors = new Float32Array(this.h_nodes);
    for(let i=0; i<this.h_nodes; i++) {
      let sum = 0;
      for(let j=0; j<this.o_nodes; j++) {
        sum += output_errors[j] * this.weights_ho[i * this.o_nodes + j];
      }
      hidden_errors[i] = sum;
    }

    // Update weights_ho and bias_o
    for(let i=0; i<this.o_nodes; i++) {
      this.bias_o[i] += this.learning_rate * output_errors[i];
      for(let j=0; j<this.h_nodes; j++) {
        this.weights_ho[j * this.o_nodes + i] += this.learning_rate * output_errors[i] * hidden[j];
      }
    }

    // Update weights_ih and bias_h
    for(let i=0; i<this.h_nodes; i++) {
      const gradient = hidden_errors[i] * this.drelu(hidden_raw[i]);
      this.bias_h[i] += this.learning_rate * gradient;
      for(let j=0; j<this.i_nodes; j++) {
        this.weights_ih[j * this.h_nodes + i] += this.learning_rate * gradient * input_array[j];
      }
    }
  }
}
