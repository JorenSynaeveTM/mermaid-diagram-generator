const fs = require("fs");
const path = require("path");
const {
  generateDiagramFromFile,
  getExercisesInfo,
  getFilename,
  generateInheritanceDiagramFromFile,
} = require("./helpers");
const { pathsToSkip, inputDir, outputDir } = require("./config");

/**
 *
 * @param {string} dir The directory to list all files from
 * @param {function} done The function to execute when all files are fetched
 */
const walk = function (dir, done) {
  let results = [];
  fs.readdir(dir, function (err, list) {
    if (err) return done(err);
    let i = 0;
    (function next() {
      let file = list[i++];
      if (!file) return done(null, results);
      file = path.resolve(dir, file);
      fs.stat(file, function (err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function (err, res) {
            results = results.concat(res);
            next();
          });
        } else {
          const tempPath = file.toLowerCase();
          if (
            tempPath.includes("models") &&
            tempPath.includes(".cs") &&
            !pathsToSkip.some((e) => tempPath.includes(e))
          ) {
            results.push(file);
          }
          next();
        }
      });
    })();
  });
};

let workDir = inputDir;

if (process.argv.length >= 3) {
  workDir = process.argv[2];
}

// Get all files that should be transformed into a diagram
walk(workDir, (err, files) => {
  if (err) throw err;

  // Group files, at the lowest level of the tree, that have the same parent folder, into an object where the key
  // is the parent folder and the value is an array the files contained therein.
  const groupedObject = files.reduce((acc, curr) => {
    const key = curr.substring(0, curr.lastIndexOf("\\"));
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(curr);
    return acc;
  }, {});

  const groupedFiles = [];

  // Transform object into an array of arrays. Each array in the top-level-array are all files from one exercise.
  Object.keys(groupedObject).forEach((key) => {
    groupedFiles.push(groupedObject[key]);
  });

  // console.log("Grouped files", groupedFiles);

  for (const files of groupedFiles) {
    try {
      console.log("Working on files", files);

      const completeDiagram = ["```mermaid"];
      completeDiagram.push("classDiagram\n");
      const [chapter, exercise, isViewModel] = getExercisesInfo(files[0]);

      console.log(chapter, exercise, isViewModel);

      // Append the inheritances
      for (const file of files) {
        const inheritanceString = generateInheritanceDiagramFromFile(file);
        console.log("Inheritance string", inheritanceString);
        completeDiagram.push(inheritanceString.join("\n"));
      }

      // Append to outputDir is isViewModel

      //Create the output dir if it does not exist
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      //console.log(`Reading ${files}`);
      for (const file of files) {
        console.log("Creating diagram for file: ", file);
        const mermaidString = generateDiagramFromFile(file);
        completeDiagram.push(mermaidString);
      }

      fs.mkdirSync(`${outputDir}`, { recursive: true });

      let filename = "";
      if (isViewModel) {
        filename = "viewmodel";
      } else {
        filename = "model";
      }

      console.log("Saving file to:", `${outputDir}/${filename}.md`);

      completeDiagram.push("```");
      fs.writeFileSync(
        `${outputDir}/${filename}.md`,
        completeDiagram.join("\n")
      );
    } catch (error) {
      console.log("Error", error);
    }
  }
});
