// This plugin uses the computeLayout module
// to assign sizes to visible components.
//
// Draws from previous work found at
// https://github.com/curran/model-contrib/blob/gh-pages/modules/boxes.js
//
// Created by Curran Kelleher Feb 2015
define(["computeLayout", "model", "async", "lodash"], function (computeLayout, Model, async, _){

  // The layout Chiasm plugin constructor function.
  return function Layout(runtime){

    // The public API object returned by the constructor function.
    var model = Model({
      publicProperties: ["layout"]
    });

    // Sets the `box` model property based on actual div size .
    function setBox(){
      model.box = {
        x: 0,
        y: 0,
        width: runtime.div.clientWidth,
        height: runtime.div.clientHeight
      };
    }

    // Initialize `model.box`.
    setBox();

    // Update `model.box` on resize
    window.addEventListener("resize", setBox);

    // Respond to changes is box and layout.
    model.when(["layout", "sizes", "box"], function(layout, sizes, box){

      // Compute the layout.
      var boxes = computeLayout(layout, sizes, box);

      // Apply the layout via the `box` property of components.
      Object.keys(boxes).forEach(function(alias){
        runtime.getComponent(alias, function(err, component){
          // TODO bubble errors to UI
          component.box = boxes[alias];
        });
      });
    });

    // Compute `sizes` from runtime components.
    model.when(["layout"], function(layout){

      // Extract the list of aliases referenced in the layout.
      var aliases = aliasesInLayout(layout);

      // Set sizes once initially.
      extractSizes(aliases);

      // Set sizes when the "size" property changes on any component.
      aliases.forEach(function(alias){
        runtime.getComponent(alias, function(err, component){
          // TODO clean up listeners, test for leaks.
          // TODO bubble errors to UI
          component.when("size", function(size){
            extractSizes(aliases);
          });
        });
      });
    });

    // Sets `model.sizes` by extracting the "size" and "hidden"
    // properties component corresponding to each alias in `aliases`.
    function extractSizes(aliases){

      // Compute which component aliases are referenced.
      var sizes = {};

      // For each alias referenced in the layout,
      async.each(
        aliases,
        function(alias, callback){
          runtime.getComponent(alias, function(err, component){
            // TODO bubble errors to UI

            // store its "size" and "hidden" properties.
            if(component.size || component.hidden){
              sizes[alias] = {};
              if(component.size){
                sizes[alias].size = component.size;
              }
              if(component.hidden){
                sizes[alias].hidden = component.size;
              }
            }
            callback();
          });
        }, function(){

          // Set the stored "size" and "hidden" properties
          // on the model to trigger the layout computation.
          if(!_.isEqual(model.sizes, sizes)){
            model.sizes = sizes;
          }
        }
      );
    }

    // Computes which aliases are referenced in the given layout.
    function aliasesInLayout(layout){
      var aliases = [];
      if(isLeafNode(layout)){
        aliases.push(layout);
      } else {
        layout.children.forEach(function(child){
          aliases.push.apply(aliases, aliasesInLayout(child));
        });
      }
      return aliases;
    }

    // Determines whether the given node in the layout tree
    // is a leaf node or a non-leaf node.
    function isLeafNode(layout){

      // If it is a leaf node, then it is a string
      // that is interpreted as a component alias.
      return typeof layout === "string";
    }

    // Return the public API.
    return model;
  };
});
