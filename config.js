const config = {
  // Whether to use lollipops for interfaces or implementation arrows.
  useLollipop: true,

  // Whether to use cursive for abstract classes and methods or <<abstract>>.
  useCursiveAbstract: false,

  // TODO Make this option have an effect.
  // Whether to group properties and methods by access, if false, -, +, #, and ~ will be used.
  // If true the output will have the form:
  // Private:
  //  somePrivateMember
  // Protected:
  //  someProtectedMember
  // Package:
  //  somePackageMember
  // Public:
  //  somePublicMember
  groupByAccess: false,

  // Whether to include properties that are prefixed with an underscore.
  includeUnderscoredProperties: false,

  // Whether to include parameters for methods and constructors.
  includeParameters: true,

  // Paths to skip when checking for model files.
  pathsToSkip: [
    "bin",
    "debug",
    "venv",
    "node_modules",
    ".csproj",
    "xaml",
    "assembly",
    "_test",
  ],

  // The root directory that must be checked for .cs files.
  inputDir: "../",

  // The directory to which the class diagrams are written.
  outputDir: "",
};

module.exports = config;
