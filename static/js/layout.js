function layout(){
	var windowWidth = $(window).width();
	var windowHeight = $(window).height();

	// Calculate & set the size of all DIVs
	var level1top_width = windowWidth;
	var level1top_height = windowHeight * 0.05;
	var level1middle_width = windowWidth;
	var level1middle_height = windowHeight * 0.95 - level1top_height;
	var level1bottom_width = windowWidth;
	var level1bottom_height = windowHeight - level1middle_height;
	$('#level1top')
		.css("width", level1top_width)
		.css("height", level1top_height);
	$('#level1middle')
		.css("width", level1middle_width)
		.css("height", level1middle_height);
	$('#level1bottom')
		.css("width", level1bottom_width)
		.css("height", level1bottom_height);

	var level2left_width = level1middle_width * 0.2;
	var level2left_height = level1middle_height;
	var level2right_width = level2left_width;
	var level2right_height = level1middle_height;
	var level2middle_width = level1middle_width - level2left_width - level2right_width;
	var level2middle_height = level1middle_height;
	$('#level2left')
		.css("width", level2left_width)
		.css("height", level2left_height);
	$('#level2right')
		.css("width", level2right_width)
		.css("height", level2right_height);
	$('#level2middle')
		.css("width", level2middle_width)
		.css("height", level2middle_height);

	var level3top_width = level2middle_width;
	var level3top_height = level2middle_height * 0.5;
	var level3bottom_width = level2middle_width;
	var level3bottom_height = level2middle_height - level3top_height;
	$('#level3top')
		.css("width", level3top_width)
		.css("height", level3top_height);
	$('#level3bottom')
		.css("width", level3bottom_width)
		.css("height", level3bottom_height);

	var level4left_width = level3bottom_width * 0.5;
	var level4left_height = level3bottom_height;
	var level4right_width = level3bottom_width - level4left_width;
	var level4right_height = level3bottom_height;
	$('#level4left')
		.css("width", level4left_width)
		.css("height", level4left_height);
	$('#level4right')
		.css("width", level4right_width)
		.css("height", level4right_height);
}

jQuery(document).ready(function($) {
	$(window).resize(layout());
});
