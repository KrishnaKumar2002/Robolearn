# RoboLearn Explorer 🤖

An interactive, browser-based playground showcasing core algorithms and concepts from Machine Learning for Robotics.

Built with **React, Vite, HTML5 Canvas**, and featuring lightweight, from-scratch implementations of Reinforcement Learning and Neural Networks, this project explores the intersection between control, perception, and learning. 

## Features

The project is split into interactive "Labs":

- **Control Lab (Drone Control):** Features a 1D physics simulation of a drone. Tune Proportional (Kp), Integral (Ki), and Derivative (Kd) gains in real-time to observe how PID controllers manage overshoot, settling time, and steady-state errors when reaching a target altitude.
- **RL Lab (Robotic Arm Reaching):** Features a 2-DOF continuous kinematic robotic arm. The simulation utilizes a tabular Q-learning approach to teach the arm how to reach a target coordinate. Watch the agent explore, decay its epsilon rate, and learn to reach the target autonomously.
- **Imitation Lab (Learning from Demonstration):** Features a 2D vehicle navigating a track with simulated LIDAR sensors. You can drive the car manually via keyboard to collect state-action data. An in-browser, custom-built Neural Network (built from scratch using matrix operations in JS) then learns from your demonstration data to drive the track autonomously!

## Development Setup

To run this project locally:

1. Clone the repository and navigate into the folder:
   ```bash
   git clone <your-repo-url>
   cd robolearn-explorer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment to GitHub Pages

This project is fully client-side and optimized for deployment to GitHub pages.

1. Ensure `gh-pages` is installed:
   ```bash
   npm install gh-pages --save-dev
   ```

2. Push your project to GitHub.

3. Run the deploy script:
   ```bash
   npm run deploy
   ```

*Note: Make sure the `base` property in `vite.config.js` matches your GitHub repository name.*

## Technologies Used

- **React & Vite:** For a fast, modern component-based UI.
- **TailwindCSS:** For rapid, premium styling and dark mode UI.
- **HTML5 Canvas:** For high-performance, 60fps physics rendering.
- **Vanilla JS:** Neural Networks and Kinematics implemented entirely from scratch without heavy backend frameworks.
