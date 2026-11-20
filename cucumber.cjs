module.exports={default:{
 paths:['features/**/*.feature'],
 require:['features/steps/**/*.cjs'],
 tags:'@publico or @cucumber-aislado',
 format:['progress','json:cucumber-report/results.json','html:cucumber-report/index.html'],
 publishQuiet:true
}};
