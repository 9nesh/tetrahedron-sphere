# WebGL Tetrahedron

Live at [https://9nesh.github.io/tetrahedron-sphere/](https://9nesh.github.io/tetrahedron-sphere/)

# What is this? 
This code implements an interactive 3D tetrahedron visualization using WebGL, showcasing various computer graphics concepts. It begins with a base tetrahedron and applies recursive subdivision to create a sphere-like appearance, normalizing vertices to maintain a uniform radius. 

The lighting model utilizes the Phong illumination technique, incorporating ambient, diffuse, and specular components, with gold material properties for a metallic look. A camera-following light source ensures consistent illumination across the object.

Texture mapping is achieved through spherical texture coordinates, with careful handling of pole regions to prevent distortion, alongside proper texture wrapping and mipmapping techniques.

Interactive controls allow users to rotate the object using θ and φ angles, adjust the camera position, control the subdivision level, and toggle visual features such as lighting, texture, and coordinate axes.

The coordinate system is visualized with RGB color-coded axes (Red for X, Green for Y, and Blue for Z), aiding in understanding the object's orientation and rotation.

Mathematical concepts applied include spherical coordinates for camera positioning, Euler angle rotations for object manipulation, normal calculations for lighting, and spherical to UV coordinate mapping for textures.

To use the application, simply open `index.html` in a WebGL-compatible browser and utilize the control panel to adjust settings, rotate the object and camera, toggle features, and reset to the default view.

The implementation is done in JavaScript using pure WebGL, without external 3D libraries, ensuring efficient buffer management for vertices, normals, and texture coordinates, all within a simple UI featuring intuitive controls.

This project has enhanced my understanding of the WebGL rendering pipeline, 3D geometry manipulation, lighting and shading models, texture mapping techniques, and interactive 3D graphics.


# How to run 
To run this, follow these steps:

1. **Clone the Repository**: 
   Clone the repository to your local machine using the following command:
   ```
   git clone https://github.com/9nesh/tetrahedron-sphere.git
   ```

2. **Navigate to the Project Directory**: 
   Change your directory to the project folder:
   ```
   cd tetrahedron-sphere
   ```

3. **Open the Project with Live Server**: 
   If you are using Visual Studio Code, you can use the Live Server extension:
   - Install the Live Server extension from the Extensions Marketplace.
   - Right-click on `index.html` in the Explorer panel and select "Open with Live Server".

4. **Using Python's HTTP Server**: 
   If you prefer using Python, you can start a simple HTTP server:
   - For Python 3.x, run the following command in the terminal:
     ```
     python -m http.server
     ```
   - For Python 2.x, use:
     ```
     python -m SimpleHTTPServer
     ```
   - After running the command, open your web browser and go to `http://localhost:8000` to view the project.

5. **Interact with the Application**: 
   Use the control panel on the left to adjust the settings such as lighting, texture, and object rotation. You can also modify the number of subdivisions for the tetrahedron.

6. **View the Output**: 
   The rendered tetrahedron will be displayed in the canvas on the right. You can see the changes in real-time as you interact with the controls.

7. **Ensure WebGL Support**: 
   Make sure your browser supports WebGL. Most modern browsers do, but you can check your browser's compatibility if you encounter issues.

