{OVERALL_GAME_HEADER}

<div id="linkoone_play_zone">

<audio id="audiosrc_linkoone_flock_completed" src="{GAMETHEMEURL}img/linkoone_flock_completed.mp3" preload="none" autobuffer></audio>
<audio id="audiosrc_o_linkoone_flock_completed" src="{GAMETHEMEURL}img/linkoone_flock_completed.ogg" preload="none" autobuffer></audio>

<div id="zoomin_left"></div>
<div id="zoomout_left"></div>

<div id="zoomin_right"></div>
<div id="zoomout_right"></div>

<div id="linkoone_zoomable">

<div id="linkoone_lines">
    <!--div id="lines_fields_wrapper">
        <div id="wire_spread_line_0" class="wire_spread"></div>
        <div id="wire_spread_line_1" class="wire_spread"></div>
        <div id="wire_spread_line_2" class="wire_spread"></div>
        <div id="wire_spread_line_3" class="wire_spread"></div>
    </div-->
    <div id="table_cards_line_0" class="table_cards_line"></div>
    <div id="table_cards_line_1" class="table_cards_line"></div>
    <div id="table_cards_line_2" class="table_cards_line"></div>
    <div id="table_cards_line_3" class="table_cards_line"></div>
</div>

<div id="linkoone_below">
    <div id="deck_container" class="whiteblock">
        <h3 class="block_title">{LABEL_DECK}</h3>
        <div id="deck">
            <div id="deck_counter">×<span id="deck_number">?</span></div>
        </div>
    </div>

    <div id="myhand_wrap" class="whiteblock">
        <!--div id="wire_spread_hand" class="wire_spread"></div-->
        <h3 class="block_title" id="label_hand">{LABEL_HAND}</h3>
        <div id="myhand">
        </div>
    </div>

    <div id="discard_container" class="whiteblock">
        <h3 class="block_title">{LABEL_DISCARD}</h3>
        <div id="discard">
            <div id="discard_under"></div>
            <div id="discard_counter">×<span id="discard_number">?</span></div>
        </div>
    </div>

    <div id="played_cards">
        <div id="all_rows">
        </div>
    </div>
</div>

</div>

</div>

<script type="text/javascript">

// Javascript HTML templates

/*
// Example:
var jstpl_some_game_item='<div class="my_game_item" id="my_game_item_${MY_ITEM_ID}"></div>';

*/

var linkoone_player_board = '\
<div id="linkoone_player_board_p${id}" class="linkoone_player_board">\
    <div id="hand_cards_p${id}" class="hand_card_container">\
        <div class="hand_card_number">×<span id="hand_card_number_p${id}">${number}</span></div>\
    </div>\
    <div id="won_cards_p${id}" class="won_card_container"></div>\
</div>';

var won_cards_type_item_number = '<span id="won_cards_p${id}_t${type}_score" class="bird_score">${number}</span>'

var won_cards_type_item = '\
<div id="won_cards_p${id}_t${type}" class="won_cards_type_container">\
    <div id="won_cards_p${id}_t${type}_logo" class="bird_type_${type} bird_type">\
    <div id="won_cards_t${type}_p_${id}" class="hover_type hover_type_${type}"></div>\
    </div> '.concat(won_cards_type_item_number).concat('</div>');

var jstpl_player_collection = '\
<div id="row_${player_id}" class="whiteblock played_cards_row">\
    <h3 class="block_title">${panel_title}</h3>\
    <div id="played_${player_id}"></div>\
</div>';

</script>  

{OVERALL_GAME_FOOTER}
